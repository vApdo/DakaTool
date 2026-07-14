"use client"

import Link from "next/link"
import { History, Trash2 } from "lucide-react"
import { RunStatusBadge } from "@/components/status-badge"
import { formatDateTime, formatDuration } from "@/lib/data"
import { clearRunHistory, useRunHistory } from "@/lib/run-history"

/** Bảng lịch sử chạy thật — dữ liệu từ localStorage của trình duyệt này. */
export function RunHistoryTable() {
  const runs = useRunHistory()

  if (runs.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-primary">
          <History className="h-6 w-6" />
        </span>
        <p className="font-medium text-black dark:text-white">Chưa có lần chạy nào</p>
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
          Lịch sử được ghi lại ngay trên trình duyệt của bạn mỗi khi chạy một tool. Hãy chạy thử một tool trong
          nhóm PDF hoặc Chứng từ, kết quả sẽ hiện ở đây.
        </p>
        <Link href="/tools" className="btn-primary mt-2">
          Xem danh sách Tool
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--card-border)] text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th scope="col" className="px-6 py-4 font-medium">Tool</th>
              <th scope="col" className="px-6 py-4 font-medium">Trạng thái</th>
              <th scope="col" className="px-6 py-4 font-medium">Thời điểm chạy</th>
              <th scope="col" className="px-6 py-4 font-medium">Thời lượng</th>
              <th scope="col" className="px-6 py-4 font-medium">Người chạy</th>
              <th scope="col" className="px-6 py-4 font-medium">Kết quả</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--card-border)]">
            {runs.map((run) => (
              <tr key={run.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-6 py-4">
                  <Link
                    href={`/tools/${run.toolId}`}
                    className="font-medium text-black hover:text-primary dark:text-white dark:hover:text-primary"
                  >
                    {run.toolName}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <RunStatusBadge status={run.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-400">
                  {formatDateTime(run.startedAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-400">
                  {formatDuration(run.durationSeconds)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-600 dark:text-gray-400">{run.runBy}</td>
                <td className="max-w-xs px-6 py-4 text-gray-600 dark:text-gray-400">
                  <span className="line-clamp-2">{run.summary}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {runs.length} lần chạy · lưu trên trình duyệt này, không gửi đi đâu.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Xóa toàn bộ lịch sử chạy trên trình duyệt này?")) clearRunHistory()
          }}
          className="btn-secondary text-xs text-gray-600 dark:text-gray-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa lịch sử
        </button>
      </div>
    </div>
  )
}
