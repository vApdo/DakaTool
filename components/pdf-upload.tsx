"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"

const MAX_SIZE_MB = 20

export function PdfUpload({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    setError(null)
    if (!file) return
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setError("Chỉ chấp nhận file PDF.")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File vượt quá ${MAX_SIZE_MB}MB. Hãy chọn file nhỏ hơn.`)
      return
    }
    onFile(file)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Chọn hoặc kéo thả file PDF"
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
          handleFile(e.dataTransfer.files[0])
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-primary bg-[color:var(--primary-soft)]"
            : "border-[color:var(--border)] hover:border-primary"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-primary">
          <FileUp className="h-6 w-6" />
        </span>
        <div>
          <p className="font-medium text-black dark:text-white">Kéo thả file PDF vào đây</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            hoặc bấm để chọn file · tối đa {MAX_SIZE_MB}MB · xử lý ngay trên máy bạn, không tải lên đâu cả
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
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
