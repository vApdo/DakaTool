"use client"

import { ArrowDown, ArrowUp, FileText, X } from "lucide-react"

interface SortableFileListProps {
  files: File[]
  onChange: (files: File[]) => void
  /** Icon thay cho FileText, vd ảnh thu nhỏ. */
  renderThumb?: (file: File) => React.ReactNode
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Danh sách file có nút đổi thứ tự / xóa — dùng cho ghép PDF và ảnh → PDF. */
export function SortableFileList({ files, onChange, renderThumb }: SortableFileListProps) {
  function move(index: number, delta: number) {
    const next = [...files]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  return (
    <ul className="space-y-2">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-[color:var(--card-border)] p-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[color:var(--primary-soft)] text-primary">
            {renderThumb?.(file) ?? <FileText className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-black dark:text-white">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(file.size)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Đưa ${file.name} lên trên`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-[color:var(--primary-soft)] hover:text-primary disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Đưa ${file.name} xuống dưới`}
              disabled={i === files.length - 1}
              onClick={() => move(i, 1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-[color:var(--primary-soft)] hover:text-primary disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Bỏ ${file.name}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
