"use client"

import { useEffect, useRef, useState } from "react"
import { ScanLine } from "lucide-react"
import type { Tool } from "@/lib/types"
import type { LoadedPdf } from "@/lib/pdf/extract-text"
import { classifyPdf } from "@/lib/pdf/classify-pdf"
import { extractHbl } from "@/lib/pdf/extract-hbl"
import { HBL_FIELD_ORDER, type HblExtractionResult } from "@/lib/pdf/types"
import { recordRun } from "@/lib/run-history"
import { PdfUpload } from "./pdf-upload"
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

  function finishRun(status: "success" | "failed", summary: string) {
    const duration =
      runStartedAt.current !== null ? Math.max(1, Math.round((Date.now() - runStartedAt.current) / 1000)) : null
    runStartedAt.current = null
    recordRun({ toolId: tool.id, toolName: tool.name, status, durationSeconds: duration, summary })
  }
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [fileName, setFileName] = useState("")
  const [result, setResult] = useState<HblExtractionResult | null>(null)
  const [isScan, setIsScan] = useState(false)
  const pdfRef = useRef<LoadedPdf | null>(null)

  // Giải phóng tài nguyên pdf.js khi unmount hoặc thay file.
  useEffect(() => {
    pdfRef.current = pdf
  }, [pdf])
  useEffect(() => {
    return () => {
      void pdfRef.current?.destroy()
    }
  }, [])

  async function handleFile(file: File) {
    setResult(null)
    setIsScan(false)
    runStartedAt.current = Date.now()
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

      finishExtraction(loaded.pages, false)
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

  function finishExtraction(pages: LoadedPdf["pages"], viaOcr: boolean) {
    const extracted = extractHbl(pages)
    setResult(extracted)
    const foundCount = HBL_FIELD_ORDER.filter((k) => extracted[k].status === "found").length
    finishRun(
      "success",
      `Trích xuất ${foundCount}/${HBL_FIELD_ORDER.length} trường từ "${fileName}"${viaOcr ? " (qua OCR)" : ""}.`,
    )
    setState({ step: "done", foundCount, totalCount: HBL_FIELD_ORDER.length, viaOcr })
  }

  async function handleRunOcr() {
    if (!pdf) return
    runStartedAt.current = Date.now()
    setState({ step: "ocr", progress: 0 })
    try {
      // Render từng trang ra ảnh PNG (scale 2 để đủ nét cho OCR).
      const scale = 2
      const renderToBlob = async (pageNumber: number, rotation: number) => {
        const canvas = document.createElement("canvas")
        await pdf.renderPage(pageNumber, canvas, { scale, rotation })
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
        if (!blob) throw new Error("canvas.toBlob failed")
        return { blob, widthPx: canvas.width, heightPx: canvas.height }
      }
      const images = []
      for (let pageNumber = 1; pageNumber <= pdf.pageCount; pageNumber++) {
        const rendered = await renderToBlob(pageNumber, 0)
        images.push({
          pageNumber,
          ...rendered,
          scale,
          // Cho provider render lại khi phát hiện bản scan bị xoay ngược/nghiêng.
          render: (rotation: number) => renderToBlob(pageNumber, rotation),
        })
      }

      const { tesseractOcrProvider } = await import("@/lib/pdf/ocr-tesseract")
      const pages = await tesseractOcrProvider.recognize(images, (progress) =>
        setState({ step: "ocr", progress }),
      )

      const hasText = pages.some((p) => p.items.length > 0)
      if (!hasText) {
        const message = "OCR không đọc được chữ nào từ bản scan này. Ảnh có thể quá mờ hoặc nghiêng."
        finishRun("failed", message)
        setState({ step: "error", message })
        return
      }
      finishExtraction(pages, true)
    } catch (err) {
      console.error("OCR error:", err)
      const message =
        "OCR gặp lỗi khi xử lý. Hãy thử lại; nếu vẫn lỗi, bản scan có thể quá lớn hoặc trình duyệt chặn Web Worker."
      finishRun("failed", message)
      setState({ step: "error", message })
    }
  }

  function handleClear() {
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
            <PdfUpload onFile={handleFile} />
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
