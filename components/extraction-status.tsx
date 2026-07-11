"use client"

import { CheckCircle2, FileWarning, Loader2, ScanLine, XCircle } from "lucide-react"

export type ExtractionState =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "analyzing" }
  | { step: "done"; foundCount: number; totalCount: number; viaOcr?: boolean }
  | { step: "needs-ocr"; pageCount: number }
  | { step: "ocr"; progress: number }
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
          Hoàn thành{state.viaOcr ? " (qua OCR — độ chính xác phụ thuộc chất lượng bản scan)" : ""}. Tìm thấy{" "}
          {state.foundCount}/{state.totalCount} trường — kiểm tra và sửa lại trước khi dùng.
        </p>
      )
    case "ocr":
      return (
        <div aria-live="polite">
          <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Đang nhận dạng chữ (OCR)... {Math.round(state.progress * 100)}%
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[color:var(--primary-fill)] transition-all duration-300"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Lần đầu chạy sẽ tải bộ nhận dạng (~14MB) về trình duyệt. Việc nhận dạng diễn ra ngay trên máy bạn.
          </p>
        </div>
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
              {state.pageCount} trang không có lớp văn bản đọc được. Bấm &quot;Nhận dạng bằng OCR&quot; để đọc chữ từ
              ảnh ngay trong trình duyệt — file không được gửi đi đâu.
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
