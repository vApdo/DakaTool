"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Download, RotateCw, Trash2, Undo2, X } from "lucide-react"
import type { Tool } from "@/lib/types"
import { baseName, downloadBytes } from "@/lib/download"
import { FileDropZone } from "./file-drop-zone"
import { RunStatusLine, errorMessage, type SimpleRunState } from "./run-status"

interface PageItem {
  /** Chỉ số trang trong file gốc (0-based). */
  sourceIndex: number
  thumb: string
  extraRotation: number
  removed: boolean
}

/** Xoay, xóa và đổi thứ tự trang PDF bằng lưới ảnh thu nhỏ, rồi xuất file mới. */
export function PdfOrganizeRunner(_props: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [state, setState] = useState<SimpleRunState>({ step: "idle" })

  async function handlePick(files: File[]) {
    const picked = files[0]
    setState({ step: "working", message: "Đang đọc file và tạo ảnh xem trước..." })
    try {
      const { loadPdf } = await import("@/lib/pdf/extract-text")
      const pdf = await loadPdf(await picked.arrayBuffer())
      const items: PageItem[] = []
      const canvas = document.createElement("canvas")
      for (let i = 1; i <= pdf.pageCount; i++) {
        await pdf.renderPage(i, canvas, { scale: 0.35, rotation: 0 })
        items.push({
          sourceIndex: i - 1,
          thumb: canvas.toDataURL("image/jpeg", 0.7),
          extraRotation: 0,
          removed: false,
        })
      }
      await pdf.destroy()
      setFile(picked)
      setPages(items)
      setState({ step: "idle" })
    } catch (err) {
      console.error("Organize PDF read error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  function update(index: number, patch: Partial<PageItem>) {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function move(index: number, delta: number) {
    setPages((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })
  }

  const keptCount = pages.filter((p) => !p.removed).length

  async function handleExport() {
    if (!file) return
    setState({ step: "working", message: "Đang tạo file mới..." })
    try {
      const { reorganizePdf } = await import("@/lib/pdf/edit")
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = await reorganizePdf(
        bytes,
        pages.filter((p) => !p.removed).map((p) => ({ sourceIndex: p.sourceIndex, extraRotation: p.extraRotation })),
      )
      const name = `${baseName(file.name)}-sap-xep.pdf`
      downloadBytes(name, result, "application/pdf")
      setState({ step: "done", message: `Đã tải về "${name}" (${keptCount} trang).` })
    } catch (err) {
      console.error("Organize PDF error:", err)
      setState({ step: "error", message: errorMessage(err) })
    }
  }

  function handleClear() {
    setFile(null)
    setPages([])
    setState({ step: "idle" })
  }

  return (
    <div className="card space-y-5 p-6">
      {!file ? (
        <FileDropZone
          accept="application/pdf,.pdf"
          title="Kéo thả file PDF cần sắp xếp trang vào đây"
          onFiles={handlePick}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-black dark:text-white">
              {file.name} <span className="font-normal text-gray-500">· giữ {keptCount}/{pages.length} trang</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={keptCount === 0 || state.step === "working"}
                className="btn-primary"
              >
                <Download className="h-4 w-4" />
                Xuất PDF mới
              </button>
              <button type="button" aria-label="Chọn file khác" onClick={handleClear} className="btn-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pages.map((page, i) => (
              <li
                key={`${page.sourceIndex}`}
                className={`rounded-xl border p-2 transition-opacity ${
                  page.removed
                    ? "border-red-300 opacity-40 dark:border-red-800"
                    : "border-[color:var(--card-border)]"
                }`}
              >
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-[color:var(--primary-soft)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.thumb}
                    alt={`Trang ${page.sourceIndex + 1}`}
                    className="max-h-full max-w-full transition-transform"
                    style={{ transform: `rotate(${page.extraRotation}deg)` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                  Trang {page.sourceIndex + 1}
                </p>
                <div className="mt-1 flex items-center justify-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Chuyển trang ${page.sourceIndex + 1} lên trước`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-[color:var(--primary-soft)] hover:text-primary disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Xoay trang ${page.sourceIndex + 1}`}
                    onClick={() => update(i, { extraRotation: (page.extraRotation + 90) % 360 })}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-[color:var(--primary-soft)] hover:text-primary"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={page.removed ? `Khôi phục trang ${page.sourceIndex + 1}` : `Bỏ trang ${page.sourceIndex + 1}`}
                    onClick={() => update(i, { removed: !page.removed })}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  >
                    {page.removed ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label={`Chuyển trang ${page.sourceIndex + 1} ra sau`}
                    disabled={i === pages.length - 1}
                    onClick={() => move(i, 1)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-[color:var(--primary-soft)] hover:text-primary disabled:opacity-30"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <RunStatusLine state={state} />
    </div>
  )
}
