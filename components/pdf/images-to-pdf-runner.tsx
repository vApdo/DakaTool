"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import type { Tool } from "@/lib/types"
import type { ImagePageSize } from "@/lib/pdf/edit"
import { downloadBytes } from "@/lib/download"
import { formatBytes } from "@/lib/pdf/limits"
import { FileDropZone } from "./file-drop-zone"
import { SortableFileList } from "./sortable-file-list"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

const PAGE_SIZES: { value: ImagePageSize; label: string }[] = [
  { value: "a4", label: "A4 dọc" },
  { value: "a4-landscape", label: "A4 ngang" },
  { value: "fit", label: "Theo kích thước ảnh" },
]

/** Chuyển ảnh JPG/PNG khác (vd HEIC không hỗ trợ) — nếu cần thì vẽ qua canvas để chuẩn hóa về JPEG. */
async function normalizeImage(file: File): Promise<{ bytes: Uint8Array; type: string }> {
  if (file.type === "image/png" || file.type === "image/jpeg") {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type }
  }
  // Định dạng khác (webp...): decode bằng trình duyệt rồi xuất JPEG.
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
  if (!blob) throw new Error(`Không đọc được ảnh "${file.name}".`)
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: "image/jpeg" }
}

/** Ghép nhiều ảnh thành một file PDF, mỗi ảnh một trang. */
export function ImagesToPdfRunner({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<File[]>([])
  const [pageSize, setPageSize] = useState<ImagePageSize>("a4")
  const [state, setState] = useToolRunState(tool)
  const [thumbs, setThumbs] = useState<Map<File, string>>(new Map())

  // Tạo/giải phóng object URL cho ảnh thu nhỏ trong danh sách.
  useEffect(() => {
    setThumbs((prev) => {
      const next = new Map<File, string>()
      for (const file of files) next.set(file, prev.get(file) ?? URL.createObjectURL(file))
      for (const [file, url] of prev) if (!next.has(file)) URL.revokeObjectURL(url)
      return next
    })
  }, [files])
  useEffect(() => () => thumbs.forEach((url) => URL.revokeObjectURL(url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConvert() {
    setState({ step: "working", message: "Đang tạo PDF..." })
    try {
      const images = []
      for (const file of files) images.push(await normalizeImage(file))
      const { imagesToPdf } = await import("@/lib/pdf/edit")
      const result = await imagesToPdf(images, { pageSize })
      downloadBytes("anh-sang-pdf.pdf", result, "application/pdf")
      setState({ step: "done", message: `Đã ghép ${files.length} ảnh và tải về "anh-sang-pdf.pdf".` })
    } catch (err) {
      console.error("Images to PDF error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      <FileDropZone
        accept="image/*"
        multiple
        existingFiles={files}
        title="Kéo thả ảnh (JPG, PNG...) vào đây"
        subtitle="chụp chứng từ bằng điện thoại rồi thả vào cũng được"
        onFiles={(added) => {
          setFiles((prev) => [...prev, ...added])
          setState({ step: "idle" })
        }}
      />
      {files.length > 0 && (
        <>
          <div>
            <p className="field-label mb-2">
              Thứ tự trang ({files.length} ảnh · {formatBytes(files.reduce((s, f) => s + f.size, 0))})
            </p>
            <SortableFileList
              files={files}
              onChange={setFiles}
              renderThumb={(file) => {
                const url = thumbs.get(file)
                // eslint-disable-next-line @next/next/no-img-element
                return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null
              }}
            />
          </div>
          <div>
            <label htmlFor="img-page-size" className="field-label">
              Khổ trang
            </label>
            <select
              id="img-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as ImagePageSize)}
              className="field-input"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleConvert} disabled={state.step === "working"} className="btn-primary">
              <FileText className="h-4 w-4" />
              Tạo PDF
            </button>
            <button type="button" onClick={() => setFiles([])} className="btn-secondary">
              Xóa danh sách
            </button>
          </div>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
