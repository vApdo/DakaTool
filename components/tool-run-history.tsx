"use client"

import Link from "next/link"
import { RunStatusBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/data"
import { useRunHistory } from "@/lib/run-history"

/** Danh sách lần chạy thật gần đây của một tool (hiện ở trang chi tiết tool). */
export function ToolRunHistory({ toolId }: { toolId: string }) {
  const runs = useRunHistory().filter((r) => r.toolId === toolId).slice(0, 3)

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Lần chạy gần đây của tool này</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tool này chưa có lịch sử chạy trên trình duyệt của bạn. Kết quả lần chạy đầu tiên sẽ hiện ở đây.
        </p>
      ) : (
        <ul className="space-y-4">
          {runs.map((run) => (
            <li key={run.id} className="rounded-xl border border-[color:var(--card-border)] p-4">
              <div className="flex items-center justify-between gap-2">
                <RunStatusBadge status={run.status} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(run.startedAt)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{run.summary}</p>
            </li>
          ))}
        </ul>
      )}
      <Link href="/history" className="btn-secondary mt-4 text-sm">
        Xem toàn bộ lịch sử
      </Link>
    </div>
  )
}

/** Dòng thông tin "N lượt chạy · Lần cuối ..." lấy từ lịch sử thật. */
export function ToolRunMeta({ toolId, category }: { toolId: string; category: string }) {
  const runs = useRunHistory().filter((r) => r.toolId === toolId)
  const last = runs[0]?.startedAt ?? null
  return (
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Nhóm {category} · {runs.length} lượt chạy trên trình duyệt này · Lần cuối: {formatDateTime(last)}
    </p>
  )
}
