"use client"

import { CheckCircle2, Loader2, XCircle } from "lucide-react"

export type SimpleRunState =
  | { step: "idle" }
  | { step: "working"; message: string }
  | { step: "done"; message: string }
  | { step: "error"; message: string }

/** Dòng trạng thái chung cho các tool PDF: đang xử lý / xong / lỗi. */
export function RunStatusLine({ state }: { state: SimpleRunState }) {
  if (state.step === "idle") return null
  if (state.step === "working") {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {state.message}
      </p>
    )
  }
  if (state.step === "done") {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300" aria-live="polite">
        <CheckCircle2 className="h-4 w-4" />
        {state.message}
      </p>
    )
  }
  return (
    <p className="flex items-start gap-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {state.message}
    </p>
  )
}

/** Đổi lỗi bất kỳ thành thông báo hiển thị được. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return "Có lỗi không xác định khi xử lý file. Hãy thử lại."
}
