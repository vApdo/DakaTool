"use client"

import { CheckCircle2, FileWarning, Loader2, ScanLine, XCircle } from "lucide-react"

export type ExtractionState =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "analyzing" }
  | { step: "done"; foundCount: number; totalCount: number }
  | { step: "needs-ocr"; pageCount: number }
  | { step: "error"; message: string }

export function ExtractionStatus({ state }: { state: ExtractionState }) {
  switch (state.step) {
    case "idle":
      return (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Chưa chọn file. Tải lên một file PDF HBL để bắt đầu.
        </p>
      )
    case "reading":
      return (
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Đang đọc PDF...
        </p>
      )
    case "analyzing":
      return (
        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Đang phân tích nội dung...
        </p>
      )
    case "done":
      return (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400" aria-live="polite">
          <CheckCircle2 className="h-4 w-4" />
          Hoàn thành. Tìm thấy {state.foundCount}/{state.totalCount} trường — kiểm tra và sửa lại trước khi dùng.
        </p>
      )
    case "needs-ocr":
      return (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          role="status"
          aria-live="polite"
        >
          <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300">
              PDF này là bản scan, cần OCR để xử lý.
            </p>
            <p className="mt-1 text-amber-700/80 dark:text-amber-300/80">
              {state.pageCount} trang không có lớp văn bản đọc được. Phiên bản hiện tại chưa hỗ trợ OCR — tính năng
              này sẽ được bổ sung sau (Tesseract.js hoặc dịch vụ OCR chuyên dụng).
            </p>
          </div>
        </div>
      )
    case "error":
      return (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4" role="alert">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-medium text-red-700 dark:text-red-300">Không xử lý được file này</p>
            <p className="mt-1 text-red-700/80 dark:text-red-300/80">{state.message}</p>
          </div>
        </div>
      )
  }
}

export function FieldNotFoundBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <FileWarning className="h-3 w-3" />
      Chưa tìm thấy
    </span>
  )
}
