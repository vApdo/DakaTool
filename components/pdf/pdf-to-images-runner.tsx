"use client"

import { useState } from "react"
import { Images, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import { baseName, downloadBlob, downloadAsZip } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

type ImageFormat = "png" | "jpeg"

const QUALITY_SCALES: { value: string; label: string; scale: number }[] = [
  { value: "web", label: "Vừa (xem trên màn hình)", scale: 1.5 },
  { value: "print", label: "Nét (in ấn)", scale: 2.5 },
]

/** Xuất từng trang PDF thành ảnh PNG/JPG; nhiều trang được gói ZIP. */
export function PdfToImagesRunner({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImageFormat>("png")
  const [quality, setQuality] = useState("web")
  const [state, setState] = useToolRunState(tool)

  async function handleConvert() {
    if (!file) return
    setState({ step: "working", message: "Đang đọc file..." })
    try {
      const { loadPdf } = await import("@/lib/pdf/extract-text")
      const pdf = await loadPdf(await file.arrayBuffer())
      const scale = QUALITY_SCALES.find((q) => q.value === quality)?.scale ?? 1.5
      const mime = format === "png" ? "image/png" : "image/jpeg"
      const base = baseName(file.name)

      const blobs: { name: string; data: Blob }[] = []
      const canvas = document.createElement("canvas")
      for (let i = 1; i <= pdf.pageCount; i++) {
        setState({ step: "working", message: `Đang xuất trang ${i}/${pdf.pageCount}...` })
        await pdf.renderPage(i, canvas, { scale, rotation: 0 })
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.9))
        if (!blob) throw new Error(`Không xuất được ảnh cho trang ${i}.`)
        blobs.push({ name: `${base}-trang-${i}.${format === "png" ? "png" : "jpg"}`, data: blob })
      }
      await pdf.destroy()

      if (blobs.length === 1) {
        downloadBlob(blobs[0].name, blobs[0].data)
        setState({ step: "done", message: `Đã tải về "${blobs[0].name}".` })
        return
      }
      await downloadAsZip(`${base}-anh.zip`, blobs)
      setState({ step: "done", message: `Đã xuất ${blobs.length} trang thành ảnh, tải về "${base}-anh.zip".` })
    } catch (err) {
      console.error("PDF to images error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone
          accept="application/pdf,.pdf"
          title="Kéo thả file PDF cần chuyển thành ảnh vào đây"
          onFiles={(files) => {
            setFile(files[0])
            setState({ step: "idle" })
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--card-border)] p-3">
          <p className="min-w-0 truncate text-sm font-medium text-black dark:text-white">{file.name}</p>
          <button
            type="button"
            aria-label="Chọn file khác"
            onClick={() => {
              setFile(null)
              setState({ step: "idle" })
            }}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {file && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="img-format" className="field-label">
                Định dạng ảnh
              </label>
              <select
                id="img-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="field-input"
              >
                <option value="png">PNG (nét, file lớn hơn)</option>
                <option value="jpeg">JPG (nhẹ, phù hợp gửi email)</option>
              </select>
            </div>
            <div>
              <label htmlFor="img-quality" className="field-label">
                Độ phân giải
              </label>
              <select
                id="img-quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="field-input"
              >
                {QUALITY_SCALES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="button" onClick={handleConvert} disabled={state.step === "working"} className="btn-primary">
            <Images className="h-4 w-4" />
            Xuất ảnh
          </button>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
