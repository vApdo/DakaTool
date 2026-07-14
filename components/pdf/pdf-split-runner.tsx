"use client"

import { useState } from "react"
import { Scissors, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import { baseName, downloadBytes, downloadAsZip } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

/** Tách PDF thành từng trang hoặc theo khoảng trang; nhiều file kết quả được gói ZIP. */
export function PdfSplitRunner({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [ranges, setRanges] = useState("")
  const [state, setState] = useToolRunState(tool)

  async function handlePick(files: File[]) {
    const picked = files[0]
    setState({ step: "working", message: "Đang đọc file..." })
    try {
      const { PDFDocument } = await import("pdf-lib")
      const doc = await PDFDocument.load(new Uint8Array(await picked.arrayBuffer()), {
        ignoreEncryption: false,
      })
      setFile(picked)
      setPageCount(doc.getPageCount())
      setState({ step: "idle" })
    } catch (err) {
      console.error("Split PDF read error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  async function handleSplit() {
    if (!file) return
    setState({ step: "working", message: "Đang tách trang..." })
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const { parsePageRanges } = await import("@/lib/pdf/page-ranges")
      const { splitPdf } = await import("@/lib/pdf/edit")
      const groups = parsePageRanges(ranges, pageCount)
      const parts = await splitPdf(bytes, groups)
      const base = baseName(file.name)

      if (parts.length === 1) {
        downloadBytes(`${base}-tach.pdf`, parts[0], "application/pdf")
        setState({ step: "done", message: `Đã tách và tải về "${base}-tach.pdf".` })
        return
      }
      await downloadAsZip(
        `${base}-tach.zip`,
        parts.map((data, i) => {
          const group = groups[i]
          const label =
            group.length === 1 ? `trang-${group[0] + 1}` : `trang-${group[0] + 1}-${group[group.length - 1] + 1}`
          return { name: `${base}-${label}.pdf`, data }
        }),
      )
      setState({ step: "done", message: `Đã tách thành ${parts.length} file, tải về "${base}-tach.zip".` })
    } catch (err) {
      console.error("Split PDF error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone accept="application/pdf,.pdf" title="Kéo thả file PDF cần tách vào đây" onFiles={handlePick} />
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
            <label htmlFor="split-ranges" className="field-label">
              Khoảng trang cần lấy
            </label>
            <input
              id="split-ranges"
              type="text"
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="vd: 1-3, 5, 7-10 · để trống để tách từng trang"
              className="field-input"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Mỗi khoảng thành một file riêng. Để trống sẽ tách toàn bộ {pageCount} trang thành {pageCount} file.
            </p>
          </div>
          <button type="button" onClick={handleSplit} disabled={state.step === "working"} className="btn-primary">
            <Scissors className="h-4 w-4" />
            Tách PDF
          </button>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
