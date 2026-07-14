"use client"

import { useEffect, useRef, useState } from "react"
import { Eraser, PenLine, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import { baseName, downloadBytes } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"

const POSITIONS: { value: string; label: string; x: number; y: number }[] = [
  { value: "bottom-right", label: "Góc dưới phải", x: 0.78, y: 0.12 },
  { value: "bottom-left", label: "Góc dưới trái", x: 0.22, y: 0.12 },
  { value: "bottom-center", label: "Dưới — giữa", x: 0.5, y: 0.12 },
  { value: "center", label: "Giữa trang", x: 0.5, y: 0.5 },
]

const PAD_WIDTH = 480
const PAD_HEIGHT = 180

/** Ký tên lên PDF: vẽ chữ ký trực tiếp hoặc dùng ảnh chữ ký có sẵn, chọn trang và vị trí. */
export function PdfSignRunner(_props: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageInput, setPageInput] = useState("cuối")
  const [position, setPosition] = useState("bottom-right")
  const [sizeRatio, setSizeRatio] = useState(0.25)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [uploadedSignature, setUploadedSignature] = useState<File | null>(null)
  const [state, setState] = useState<SimpleRunState>({ step: "idle" })

  const padRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  // Khởi tạo nét vẽ cho bảng ký.
  useEffect(() => {
    const canvas = padRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1d4ed8"
  }, [file])

  function padPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = padRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function clearPad() {
    const canvas = padRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }

  async function handlePick(files: File[]) {
    const picked = files[0]
    setState({ step: "working", message: "Đang đọc file..." })
    try {
      const { PDFDocument } = await import("pdf-lib")
      const doc = await PDFDocument.load(new Uint8Array(await picked.arrayBuffer()))
      setFile(picked)
      setPageCount(doc.getPageCount())
      setState({ step: "idle" })
    } catch (err) {
      console.error("Sign PDF read error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  /** Cắt phần trắng thừa quanh nét ký để chữ ký đặt lên trang được gọn. */
  function exportPadPng(): Uint8Array | null {
    const canvas = padRef.current
    if (!canvas || !hasDrawing) return null
    const ctx = canvas.getContext("2d")!
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null
    const pad = 6
    const cropW = maxX - minX + pad * 2
    const cropH = maxY - minY + pad * 2
    const cropped = document.createElement("canvas")
    cropped.width = cropW
    cropped.height = cropH
    cropped.getContext("2d")!.drawImage(canvas, minX - pad, minY - pad, cropW, cropH, 0, 0, cropW, cropH)
    const binary = atob(cropped.toDataURL("image/png").split(",")[1])
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  }

  function parsePages(): number[] {
    const trimmed = pageInput.trim().toLowerCase()
    if (!trimmed || trimmed === "cuối" || trimmed === "cuoi") return [pageCount - 1]
    if (trimmed === "tất cả" || trimmed === "tat ca" || trimmed === "*") {
      return Array.from({ length: pageCount }, (_, i) => i)
    }
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 1 || n > pageCount) {
      throw new Error(`Trang "${pageInput}" không hợp lệ. Nhập số 1–${pageCount}, "cuối" hoặc "tất cả".`)
    }
    return [n - 1]
  }

  async function handleSign() {
    if (!file) return
    setState({ step: "working", message: "Đang chèn chữ ký..." })
    try {
      let png: Uint8Array | null = null
      if (uploadedSignature) {
        // Ảnh chữ ký tải lên: chuẩn hóa về PNG qua canvas (giữ nền trong nếu có).
        const bitmap = await createImageBitmap(uploadedSignature)
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
        const binary = atob(canvas.toDataURL("image/png").split(",")[1])
        png = Uint8Array.from(binary, (c) => c.charCodeAt(0))
      } else {
        png = exportPadPng()
      }
      if (!png) {
        setState({ step: "error", message: "Chưa có chữ ký. Hãy vẽ vào ô bên dưới hoặc tải ảnh chữ ký lên." })
        return
      }

      const pos = POSITIONS.find((p) => p.value === position) ?? POSITIONS[0]
      const { stampImage } = await import("@/lib/pdf/edit")
      const result = await stampImage(new Uint8Array(await file.arrayBuffer()), png, {
        centerXRatio: pos.x,
        centerYRatio: pos.y,
        widthRatio: sizeRatio,
        pageIndices: parsePages(),
      })
      const name = `${baseName(file.name)}-da-ky.pdf`
      downloadBytes(name, result, "application/pdf")
      setState({ step: "done", message: `Đã chèn chữ ký và tải về "${name}".` })
    } catch (err) {
      console.error("Sign PDF error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone accept="application/pdf,.pdf" title="Kéo thả file PDF cần ký vào đây" onFiles={handlePick} />
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--card-border)] p-3">
          <p className="min-w-0 truncate text-sm font-medium text-black dark:text-white">
            {file.name} <span className="font-normal text-gray-500">· {pageCount} trang</span>
          </p>
          <button
            type="button"
            aria-label="Chọn file khác"
            onClick={() => {
              setFile(null)
              setUploadedSignature(null)
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
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="field-label mb-0">Chữ ký {uploadedSignature ? `(ảnh: ${uploadedSignature.name})` : "(vẽ bằng tay hoặc chuột)"}</p>
              <div className="flex items-center gap-2">
                <label className="btn-secondary cursor-pointer text-xs">
                  Tải ảnh chữ ký
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setUploadedSignature(e.target.files?.[0] ?? null)
                      e.target.value = ""
                    }}
                  />
                </label>
                {uploadedSignature ? (
                  <button type="button" onClick={() => setUploadedSignature(null)} className="btn-secondary text-xs">
                    <X className="h-3.5 w-3.5" />
                    Bỏ ảnh
                  </button>
                ) : (
                  <button type="button" onClick={clearPad} className="btn-secondary text-xs">
                    <Eraser className="h-3.5 w-3.5" />
                    Xóa nét
                  </button>
                )}
              </div>
            </div>
            {!uploadedSignature && (
              <canvas
                ref={padRef}
                width={PAD_WIDTH}
                height={PAD_HEIGHT}
                className="w-full touch-none rounded-xl border-2 border-dashed border-[color:var(--border)] bg-white"
                aria-label="Ô vẽ chữ ký"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  drawing.current = true
                  const ctx = e.currentTarget.getContext("2d")!
                  const p = padPoint(e)
                  ctx.beginPath()
                  ctx.moveTo(p.x, p.y)
                }}
                onPointerMove={(e) => {
                  if (!drawing.current) return
                  const ctx = e.currentTarget.getContext("2d")!
                  const p = padPoint(e)
                  ctx.lineTo(p.x, p.y)
                  ctx.stroke()
                  setHasDrawing(true)
                }}
                onPointerUp={() => {
                  drawing.current = false
                }}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="sign-page" className="field-label">
                Ký lên trang
              </label>
              <input
                id="sign-page"
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder={`1–${pageCount}, "cuối" hoặc "tất cả"`}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="sign-position" className="field-label">
                Vị trí
              </label>
              <select
                id="sign-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="field-input"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sign-size" className="field-label">
                Kích thước
              </label>
              <select
                id="sign-size"
                value={sizeRatio}
                onChange={(e) => setSizeRatio(Number(e.target.value))}
                className="field-input"
              >
                <option value={0.15}>Nhỏ</option>
                <option value={0.25}>Vừa</option>
                <option value={0.35}>Lớn</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSign}
            disabled={state.step === "working" || (!hasDrawing && !uploadedSignature)}
            className="btn-primary"
          >
            <PenLine className="h-4 w-4" />
            Chèn chữ ký và tải về
          </button>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
