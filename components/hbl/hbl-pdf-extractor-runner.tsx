"use client"

import { useEffect, useRef, useState } from "react"
import { ScanLine, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import type { LoadedPdf } from "@/lib/pdf/extract-text"
import { classifyPdf } from "@/lib/pdf/classify-pdf"
import { extractHbl } from "@/lib/pdf/extract-hbl"
import { PDF_LIMITS } from "@/lib/pdf/limits"
import { HBL_FIELD_ORDER, type HblExtractionResult } from "@/lib/pdf/types"
import { recordFinishedRun } from "@/lib/run-history"
import { FileDropZone } from "../pdf/file-drop-zone"
import { PdfPreview } from "./pdf-preview"
import { ExtractionStatus, type ExtractionState } from "./extraction-status"
import { HblExtractionForm } from "./hbl-extraction-form"

/**
 * Runner thật cho tool "Trích xuất dữ liệu HBL từ PDF".
 * Toàn bộ xử lý diễn ra trong trình duyệt: đọc PDF → phân loại text/scan →
 * trích xuất trường HBL → cho sửa/copy/xuất JSON. Không upload, không lưu file.
 */
export function HblPdfExtractorRunner({ tool }: { tool: Tool }) {
  const [state, setState] = useState<ExtractionState>({ step: "idle" })
  const runStartedAt = useRef<number | null>(null)
  // Tên file đang xử lý, giữ trong ref để không phụ thuộc state cập nhật bất đồng bộ
  // khi build summary lịch sử (state fileName có thể chưa kịp đổi trong cùng tick).
  const processedFileName = useRef("")

  function finishRun(status: "success" | "failed", summary: string) {
    recordFinishedRun({ toolId: tool.id, toolName: tool.name, status, startedAtMs: runStartedAt.current, summary })
    runStartedAt.current = null
  }
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [fileName, setFileName] = useState("")
  const [result, setResult] = useState<HblExtractionResult | null>(null)
  const [isScan, setIsScan] = useState(false)
  const pdfRef = useRef<LoadedPdf | null>(null)
  // Chống cập nhật state sau khi component unmount, và cho phép hủy OCR đang chạy.
  const mountedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)

  // Giải phóng tài nguyên pdf.js khi unmount hoặc thay file.
  useEffect(() => {
    pdfRef.current = pdf
  }, [pdf])
  useEffect(() => {
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      void pdfRef.current?.destroy()
    }
  }, [])

  async function handleFile(file: File) {
    setResult(null)
    setIsScan(false)
    runStartedAt.current = Date.now()
    processedFileName.current = file.name
    setState({ step: "reading" })
    void pdf?.destroy()
    setPdf(null)
    setFileName(file.name)

    try {
      const data = await file.arrayBuffer()
      const { loadPdf } = await import("@/lib/pdf/extract-text")
      const loaded = await loadPdf(data)
      setPdf(loaded)

      setState({ step: "analyzing" })
      const classification = classifyPdf(loaded.pages)
      setIsScan(classification.kind === "scan")
      if (classification.kind === "scan") {
        setState({ step: "needs-ocr", pageCount: classification.pageCount })
        return
      }

      finishExtraction(loaded.pages, false, file.name)
    } catch (err) {
      console.error("PDF load error:", err)
      const message =
        err instanceof Error && err.name === "PasswordException"
          ? "File PDF có mật khẩu. Hãy gỡ mật khẩu rồi thử lại."
          : "File có thể bị hỏng hoặc không phải PDF hợp lệ. Hãy thử mở file bằng trình đọc PDF để kiểm tra."
      finishRun("failed", message)
      setState({ step: "error", message })
    }
  }

  // processedName được truyền tường minh (không đọc state fileName) để summary
  // luôn khớp đúng file vừa xử lý ở cả luồng text lẫn OCR.
  function finishExtraction(pages: LoadedPdf["pages"], viaOcr: boolean, processedName: string) {
    const extracted = extractHbl(pages)
    setResult(extracted)
    const foundCount = HBL_FIELD_ORDER.filter((k) => extracted[k].status === "found").length
    finishRun(
      "success",
      `Trích xuất ${foundCount}/${HBL_FIELD_ORDER.length} trường từ "${processedName}"${viaOcr ? " (qua OCR)" : ""}.`,
    )
    setState({ step: "done", foundCount, totalCount: HBL_FIELD_ORDER.length, viaOcr })
  }

  async function handleRunOcr() {
    const activePdf = pdf
    if (!activePdf) return
    const controller = new AbortController()
    abortRef.current = controller
    runStartedAt.current = Date.now()
    setState({ step: "ocr", progress: 0 })

    // Render một trang ra ảnh PNG (scale 2 để đủ nét cho OCR) rồi GIẢI PHÓNG canvas ngay.
    // Provider gọi hàm này lần lượt từng trang nên mỗi lúc chỉ một ảnh trong RAM.
    const scale = 2
    const renderPage = async (pageNumber: number, rotation: number) => {
      const canvas = document.createElement("canvas")
      try {
        await activePdf.renderPage(pageNumber, canvas, { scale, rotation })
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
        if (!blob) throw new Error("canvas.toBlob failed")
        return { blob, widthPx: canvas.width, heightPx: canvas.height }
      } finally {
        // Xóa pixel buffer của canvas ngay — quan trọng để tránh dồn RAM trên điện thoại.
        canvas.width = 0
        canvas.height = 0
      }
    }

    try {
      // OCR rất tốn RAM/CPU — chỉ xử lý tối đa PDF_LIMITS.ocrMaxPages trang đầu.
      const ocrPageCount = Math.min(activePdf.pageCount, PDF_LIMITS.ocrMaxPages)
      const { tesseractOcrProvider } = await import("@/lib/pdf/ocr-tesseract")
      const pages = await tesseractOcrProvider.recognize(
        { pageCount: ocrPageCount, scale, renderPage, signal: controller.signal },
        (progress) => {
          if (mountedRef.current) setState({ step: "ocr", progress })
        },
      )
      if (!mountedRef.current) return

      const hasText = pages.some((p) => p.items.length > 0)
      if (!hasText) {
        const message = "OCR không đọc được chữ nào từ bản scan này. Ảnh có thể quá mờ hoặc nghiêng."
        finishRun("failed", message)
        setState({ step: "error", message })
        return
      }
      finishExtraction(pages, true, processedFileName.current)
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // Người dùng hủy: quay lại trạng thái cần OCR, không tính là lỗi hay lần chạy.
        runStartedAt.current = null
        if (mountedRef.current) setState({ step: "needs-ocr", pageCount: activePdf.pageCount })
        return
      }
      console.error("OCR error:", err)
      if (!mountedRef.current) return
      const message =
        "OCR gặp lỗi khi xử lý. Hãy thử lại; nếu vẫn lỗi, bản scan có thể quá lớn hoặc trình duyệt chặn Web Worker."
      finishRun("failed", message)
      setState({ step: "error", message })
    } finally {
      abortRef.current = null
    }
  }

  function handleCancelOcr() {
    abortRef.current?.abort()
  }

  function handleClear() {
    abortRef.current?.abort()
    void pdf?.destroy()
    setPdf(null)
    setResult(null)
    setFileName("")
    setState({ step: "idle" })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Cột trái: upload + xem trước PDF */}
      <div className="min-w-0">
        {pdf ? (
          <PdfPreview pdf={pdf} fileName={fileName} onClear={handleClear} />
        ) : (
          <div className="card p-6">
            <FileDropZone
              accept="application/pdf,.pdf"
              title="Kéo thả file PDF vào đây"
              onFiles={([file]) => handleFile(file)}
            />
          </div>
        )}
      </div>

      {/* Cột phải: trạng thái + dữ liệu trích xuất */}
      <div className="min-w-0">
        <div className="card p-6">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Dữ liệu trích xuất</h2>
          <ExtractionStatus state={state} />
          {(state.step === "needs-ocr" || (state.step === "error" && isScan && pdf)) && (
            <button type="button" onClick={handleRunOcr} className="btn-primary mt-4">
              <ScanLine className="h-4 w-4" />
              {state.step === "error" ? "Thử OCR lại" : "Nhận dạng bằng OCR"}
            </button>
          )}
          {state.step === "ocr" && (
            <button type="button" onClick={handleCancelOcr} className="btn-secondary mt-4">
              <X className="h-4 w-4" />
              Hủy OCR
            </button>
          )}
          {result && state.step === "done" && (
            <div className="mt-5">
              <HblExtractionForm result={result} fileName={fileName} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
