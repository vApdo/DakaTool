"use client"

import { useEffect, useRef, useState } from "react"
import type { Tool } from "@/lib/types"
import type { LoadedPdf } from "@/lib/pdf/extract-text"
import { classifyPdf } from "@/lib/pdf/classify-pdf"
import { extractHbl } from "@/lib/pdf/extract-hbl"
import { HBL_FIELD_ORDER, type HblExtractionResult } from "@/lib/pdf/types"
import { PdfUpload } from "./pdf-upload"
import { PdfPreview } from "./pdf-preview"
import { ExtractionStatus, type ExtractionState } from "./extraction-status"
import { HblExtractionForm } from "./hbl-extraction-form"

/**
 * Runner thật cho tool "Trích xuất dữ liệu HBL từ PDF".
 * Toàn bộ xử lý diễn ra trong trình duyệt: đọc PDF → phân loại text/scan →
 * trích xuất trường HBL → cho sửa/copy/xuất JSON. Không upload, không lưu file.
 */
export function HblPdfExtractorRunner(_props: { tool: Tool }) {
  const [state, setState] = useState<ExtractionState>({ step: "idle" })
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [fileName, setFileName] = useState("")
  const [result, setResult] = useState<HblExtractionResult | null>(null)
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
      if (classification.kind === "scan") {
        setState({ step: "needs-ocr", pageCount: classification.pageCount })
        return
      }

      const extracted = extractHbl(loaded.pages)
      setResult(extracted)
      const foundCount = HBL_FIELD_ORDER.filter((k) => extracted[k].status === "found").length
      setState({ step: "done", foundCount, totalCount: HBL_FIELD_ORDER.length })
    } catch (err) {
      setState({
        step: "error",
        message:
          err instanceof Error && err.name === "PasswordException"
            ? "File PDF có mật khẩu. Hãy gỡ mật khẩu rồi thử lại."
            : "File có thể bị hỏng hoặc không phải PDF hợp lệ. Hãy thử mở file bằng trình đọc PDF để kiểm tra.",
      })
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
