import Link from "next/link"
import { Download } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { RunStatusBadge } from "@/components/status-badge"
import { runs, formatDateTime, formatDuration } from "@/lib/data"

export const metadata = { title: "Lịch sử chạy - DakaTool" }

export default function HistoryPage() {
  return (
    <div>
      <PageHeader
        title="Lịch sử chạy Tool"
        description="Toàn bộ các lần chạy gần đây, ai chạy, mất bao lâu và kết quả ra sao."
        action={
          <Link href="/export" className="btn-outline">
            <Download className="h-4 w-4" />
            Export kết quả
          </Link>
        }
      />

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
    </div>
  )
}
