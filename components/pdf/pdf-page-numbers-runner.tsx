"use client"

import { useState } from "react"
import { Hash, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import type { PageNumberFormat, PageNumberPosition } from "@/lib/pdf/edit"
import { baseName, downloadBytes } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: "bottom-center", label: "Dưới — giữa" },
  { value: "bottom-right", label: "Dưới — phải" },
  { value: "bottom-left", label: "Dưới — trái" },
  { value: "top-center", label: "Trên — giữa" },
  { value: "top-right", label: "Trên — phải" },
  { value: "top-left", label: "Trên — trái" },
]

const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: "n", label: "1, 2, 3..." },
  { value: "n-of-total", label: "1/10, 2/10..." },
  { value: "trang-n-of-total", label: "Trang 1/10..." },
]

/** Đánh số trang cho PDF, chọn vị trí và kiểu hiển thị. */
export function PdfPageNumbersRunner({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center")
  const [format, setFormat] = useState<PageNumberFormat>("n")
  const [startAt, setStartAt] = useState(1)
  const [state, setState] = useToolRunState(tool)

  async function handleApply() {
    if (!file) return
    setState({ step: "working", message: "Đang đánh số trang..." })
    try {
      const { addPageNumbers } = await import("@/lib/pdf/edit")
      const result = await addPageNumbers(new Uint8Array(await file.arrayBuffer()), {
        position,
        format,
        startAt: Number.isFinite(startAt) && startAt > 0 ? startAt : 1,
        fontSize: 11,
      })
      const name = `${baseName(file.name)}-danh-so.pdf`
      downloadBytes(name, result, "application/pdf")
      setState({ step: "done", message: `Đã đánh số trang và tải về "${name}".` })
    } catch (err) {
      console.error("Page numbers error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone
          accept="application/pdf,.pdf"
          title="Kéo thả file PDF cần đánh số trang vào đây"
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="pn-position" className="field-label">
                Vị trí
              </label>
              <select
                id="pn-position"
                value={position}
                onChange={(e) => setPosition(e.target.value as PageNumberPosition)}
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
              <label htmlFor="pn-format" className="field-label">
                Kiểu số
              </label>
              <select
                id="pn-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as PageNumberFormat)}
                className="field-input"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pn-start" className="field-label">
                Bắt đầu từ số
              </label>
              <input
                id="pn-start"
                type="number"
                min={1}
                value={startAt}
                onChange={(e) => setStartAt(Number(e.target.value))}
                className="field-input"
              />
            </div>
          </div>
          <button type="button" onClick={handleApply} disabled={state.step === "working"} className="btn-primary">
            <Hash className="h-4 w-4" />
            Đánh số trang
          </button>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
