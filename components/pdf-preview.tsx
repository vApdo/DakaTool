"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw, ZoomIn, ZoomOut, X } from "lucide-react"
import type { LoadedPdf } from "@/lib/pdf/extract-text"

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.25

export function PdfPreview({
  pdf,
  fileName,
  onClear,
}: {
  pdf: LoadedPdf
  fileName: string
  onClear: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    void pdf.renderPage(page, canvas, { scale, rotation })
  }, [pdf, page, scale, rotation])

  const controlBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border)] transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none"

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black dark:text-white" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{pdf.pageCount} trang</p>
        </div>
        <button type="button" onClick={onClear} className={controlBtn} aria-label="Bỏ file này, chọn file khác">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--card-border)] pb-3">
        <button
          type="button"
          className={controlBtn}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center text-xs text-gray-600 dark:text-gray-400">
          Trang {page}/{pdf.pageCount}
        </span>
        <button
          type="button"
          className={controlBtn}
          onClick={() => setPage((p) => Math.min(pdf.pageCount, p + 1))}
          disabled={page >= pdf.pageCount}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-[color:var(--border)]" />
        <button
          type="button"
          className={controlBtn}
          onClick={() => setRotation((r) => (r + 270) % 360)}
          aria-label="Xoay trái"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={controlBtn}
          onClick={() => setRotation((r) => (r + 90) % 360)}
          aria-label="Xoay phải"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-[color:var(--border)]" />
        <button
          type="button"
          className={controlBtn}
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
          disabled={scale <= MIN_SCALE}
          aria-label="Thu nhỏ"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-12 text-center text-xs text-gray-600 dark:text-gray-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          className={controlBtn}
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
          disabled={scale >= MAX_SCALE}
          aria-label="Phóng to"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 max-h-[70vh] overflow-auto rounded-lg bg-black/5 p-2 dark:bg-white/5">
        <canvas ref={canvasRef} className="mx-auto shadow-md" />
      </div>
    </div>
  )
}
