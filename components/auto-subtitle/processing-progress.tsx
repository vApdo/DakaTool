"use client"

import { Loader2 } from "lucide-react"
import type { ProjectStatusDTO } from "@/lib/auto-subtitle/types"

const STAGE_LABELS: Record<string, string> = {
  QUEUED: "Đang chờ trong hàng đợi…",
  EXTRACTING_AUDIO: "Đang tách âm thanh…",
  TRANSCRIBING: "Đang nhận dạng giọng nói…",
  FORMATTING: "Đang tạo phụ đề…",
  RENDERING: "Đang ghép phụ đề vào video…",
}

export function ProcessingProgress({
  status,
  progress,
}: {
  status: ProjectStatusDTO
  progress: number
}) {
  const label = STAGE_LABELS[status] ?? "Đang xử lý…"
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-800 dark:bg-gray-900/40">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-medium text-black dark:text-white">{label}</p>
      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-gray-500">{progress}%</p>
      <p className="max-w-md text-xs text-gray-400">
        Bạn có thể rời trang và quay lại — tiến trình vẫn chạy trên máy chủ.
      </p>
    </div>
  )
}
