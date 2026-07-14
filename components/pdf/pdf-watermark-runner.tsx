"use client"

import { useState } from "react"
import { Stamp, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import { baseName, downloadBytes } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

const COLORS: { value: string; label: string; css: string }[] = [
  { value: "gray", label: "Xám", css: "#6b7280" },
  { value: "red", label: "Đỏ", css: "#dc2626" },
  { value: "blue", label: "Xanh", css: "#2563eb" },
]

/**
 * Vẽ chữ watermark lên canvas rồi xuất PNG.
 * Đi đường canvas để hiển thị đúng tiếng Việt có dấu — font chuẩn của PDF
 * (Helvetica WinAnsi) không có các ký tự này.
 */
function renderWatermarkPng(text: string, colorCss: string, diagonal: boolean): Uint8Array {
  const fontSize = 96
  const measure = document.createElement("canvas").getContext("2d")!
  measure.font = `600 ${fontSize}px Arial, sans-serif`
  const textWidth = Math.ceil(measure.measureText(text).width)
  const textHeight = Math.ceil(fontSize * 1.3)

  const canvas = document.createElement("canvas")
  if (diagonal) {
    // Xoay -35°: canvas phải đủ chỗ cho hình chữ nhật chữ đã xoay.
    const rad = (35 * Math.PI) / 180
    canvas.width = Math.ceil(textWidth * Math.cos(rad) + textHeight * Math.sin(rad))
    canvas.height = Math.ceil(textWidth * Math.sin(rad) + textHeight * Math.cos(rad))
  } else {
    canvas.width = textWidth
    canvas.height = textHeight
  }
  const ctx = canvas.getContext("2d")!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  if (diagonal) ctx.rotate((-35 * Math.PI) / 180)
  ctx.font = `600 ${fontSize}px Arial, sans-serif`
  ctx.fillStyle = colorCss
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 0, 0)

  const dataUrl = canvas.toDataURL("image/png")
  const binary = atob(dataUrl.split(",")[1])
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** Đóng chữ mờ (COPY, DRAFT, tên công ty...) lên mọi trang của PDF. */
export function PdfWatermarkRunner({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("COPY")
  const [color, setColor] = useState("gray")
  const [opacity, setOpacity] = useState(0.2)
  const [diagonal, setDiagonal] = useState(true)
  const [state, setState] = useToolRunState(tool)

  async function handleApply() {
    if (!file || !text.trim()) return
    setState({ step: "working", message: "Đang đóng dấu..." })
    try {
      const colorCss = COLORS.find((c) => c.value === color)?.css ?? COLORS[0].css
      const png = renderWatermarkPng(text.trim(), colorCss, diagonal)
      const { stampImage } = await import("@/lib/pdf/edit")
      const result = await stampImage(new Uint8Array(await file.arrayBuffer()), png, {
        centerXRatio: 0.5,
        centerYRatio: 0.5,
        widthRatio: 0.7,
        opacity,
      })
      const name = `${baseName(file.name)}-dong-dau.pdf`
      downloadBytes(name, result, "application/pdf")
      setState({ step: "done", message: `Đã đóng dấu "${text.trim()}" và tải về "${name}".` })
    } catch (err) {
      console.error("Watermark error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone
          accept="application/pdf,.pdf"
          title="Kéo thả file PDF cần đóng dấu vào đây"
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
          <div>
            <label htmlFor="wm-text" className="field-label">
              Nội dung dấu
            </label>
            <input
              id="wm-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="vd: COPY, DRAFT, BẢN SAO..."
              className="field-input"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="wm-color" className="field-label">
                Màu chữ
              </label>
              <select id="wm-color" value={color} onChange={(e) => setColor(e.target.value)} className="field-input">
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wm-opacity" className="field-label">
                Độ đậm
              </label>
              <select
                id="wm-opacity"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="field-input"
              >
                <option value={0.1}>Rất mờ</option>
                <option value={0.2}>Mờ</option>
                <option value={0.4}>Vừa</option>
                <option value={0.7}>Đậm</option>
              </select>
            </div>
            <div>
              <label htmlFor="wm-direction" className="field-label">
                Hướng chữ
              </label>
              <select
                id="wm-direction"
                value={diagonal ? "diagonal" : "horizontal"}
                onChange={(e) => setDiagonal(e.target.value === "diagonal")}
                className="field-input"
              >
                <option value="diagonal">Chéo trang</option>
                <option value="horizontal">Nằm ngang</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={!text.trim() || state.step === "working"}
            className="btn-primary"
          >
            <Stamp className="h-4 w-4" />
            Đóng dấu lên mọi trang
          </button>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
