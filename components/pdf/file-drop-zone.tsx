"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"
import { PDF_LIMITS, formatBytes, validatePdfFiles } from "@/lib/pdf/limits"

interface FileDropZoneProps {
  /** Danh sách MIME/đuôi file chấp nhận, vd "application/pdf,.pdf". */
  accept: string
  multiple?: boolean
  title: string
  subtitle?: string
  onFiles: (files: File[]) => void
  /** File đã chọn từ trước (khi tool tích lũy nhiều lần thả) — để tính tổng đúng. */
  existingFiles?: File[]
}

/** Ô kéo thả file dùng chung cho các tool PDF — lọc định dạng + giới hạn tài nguyên. */
export function FileDropZone({
  accept,
  multiple = false,
  title,
  subtitle,
  onFiles,
  existingFiles = [],
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFiles(list: FileList | null) {
    setError(null)
    if (!list || list.length === 0) return
    const batch = Array.from(list)
    // Kiểm tra trên TOÀN BỘ tập file (đã chọn + mới thả) để chặn vượt tổng dung lượng/số file.
    const combined = multiple ? [...existingFiles, ...batch] : batch
    const check = validatePdfFiles(combined, { accept, multiple })
    if (!check.ok) {
      setError(check.error ?? "File không hợp lệ.")
      return
    }
    onFiles(multiple ? batch : batch.slice(0, 1))
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={title}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-[color:var(--primary-soft)]"
            : "border-[color:var(--border)] hover:border-primary"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-primary">
          <FileUp className="h-6 w-6" />
        </span>
        <div>
          <p className="font-medium text-black dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {subtitle ?? "hoặc bấm để chọn file"} · tối đa {PDF_LIMITS.maxFiles} file ·{" "}
            {formatBytes(PDF_LIMITS.maxSingleBytes)}/file · xử lý ngay trên máy bạn, không tải lên đâu cả
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
