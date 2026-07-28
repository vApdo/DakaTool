"use client"

import { useState } from "react"
import { Combine } from "lucide-react"
import type { Tool } from "@/lib/types"
import { downloadBytes } from "@/lib/download"
import { formatBytes } from "@/lib/pdf/limits"
import { FileDropZone } from "./file-drop-zone"
import { SortableFileList } from "./sortable-file-list"
import { RunStatusLine, errorMessage } from "./run-status"
import { useToolRunState } from "./use-tool-run-state"

/** Ghép nhiều PDF thành một file, theo thứ tự người dùng sắp xếp. */
export function PdfMergeRunner({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useToolRunState(tool)

  async function handleMerge() {
    setState({ step: "working", message: "Đang ghép file..." })
    try {
      const buffers: Uint8Array[] = []
      for (const file of files) buffers.push(new Uint8Array(await file.arrayBuffer()))
      const { mergePdfs } = await import("@/lib/pdf/edit")
      const merged = await mergePdfs(buffers)
      downloadBytes("ghep-pdf.pdf", merged, "application/pdf")
      setState({ step: "done", message: `Đã ghép ${files.length} file và tải về "ghep-pdf.pdf".` })
    } catch (err) {
      console.error("Merge PDF error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  return (
    <div className="card space-y-5 p-6">
      <FileDropZone
        accept="application/pdf,.pdf"
        multiple
        existingFiles={files}
        title="Kéo thả các file PDF cần ghép vào đây"
        onFiles={(added) => {
          setFiles((prev) => [...prev, ...added])
          setState({ step: "idle" })
        }}
      />
      {files.length > 0 && (
        <>
          <div>
            <p className="field-label mb-2">
              Thứ tự ghép ({files.length} file · {formatBytes(files.reduce((s, f) => s + f.size, 0))})
            </p>
            <SortableFileList files={files} onChange={setFiles} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleMerge}
              disabled={files.length < 2 || state.step === "working"}
              className="btn-primary"
            >
              <Combine className="h-4 w-4" />
              Ghép {files.length} file
            </button>
            <button type="button" onClick={() => setFiles([])} className="btn-secondary">
              Xóa danh sách
            </button>
          </div>
          {files.length === 1 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Thêm ít nhất một file nữa để ghép.</p>
          )}
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
