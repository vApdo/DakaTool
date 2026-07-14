"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"

const MAX_SIZE_MB = 20

interface FileDropZoneProps {
  /** Danh sách MIME/đuôi file chấp nhận, vd "application/pdf,.pdf". */
  accept: string
  multiple?: boolean
  title: string
  subtitle?: string
  onFiles: (files: File[]) => void
}

/** Ô kéo thả file dùng chung cho các tool PDF — lọc theo định dạng và giới hạn dung lượng. */
export function FileDropZone({ accept, multiple = false, title, subtitle, onFiles }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptList = accept.split(",").map((a) => a.trim().toLowerCase())

  function matches(file: File): boolean {
    return acceptList.some((a) =>
      a.startsWith(".")
        ? file.name.toLowerCase().endsWith(a)
        : a.endsWith("/*")
          ? file.type.startsWith(a.slice(0, -1))
          : file.type === a,
    )
  }

  function handleFiles(list: FileList | null) {
    setError(null)
    if (!list || list.length === 0) return
    const files = Array.from(list)
    const wrong = files.find((f) => !matches(f))
    if (wrong) {
      setError(`File "${wrong.name}" không đúng định dạng cho tool này.`)
      return
    }
    const tooBig = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`File "${tooBig.name}" vượt quá ${MAX_SIZE_MB}MB. Hãy chọn file nhỏ hơn.`)
      return
    }
    onFiles(multiple ? files : files.slice(0, 1))
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
            {subtitle ?? "hoặc bấm để chọn file"} · tối đa {MAX_SIZE_MB}MB · xử lý ngay trên máy bạn, không tải
            lên đâu cả
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
