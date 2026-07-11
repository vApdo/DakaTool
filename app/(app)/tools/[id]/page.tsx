import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ToolIcon } from "@/components/tool-icon"
import { ToolStatusBadge, RunStatusBadge } from "@/components/status-badge"
import { ToolRunner } from "@/components/tool-runner"
import { getToolById, tools, runs, formatDateTime } from "@/lib/data"

export function generateStaticParams() {
  return tools.map((t) => ({ id: t.id }))
}

export default function ToolRunPage({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id)
  if (!tool) notFound()

  const toolRuns = runs.filter((r) => r.toolId === tool.id).slice(0, 3)

  return (
    <div>
      <Link href="/tools" className="btn-secondary mb-6 text-gray-600 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Danh sách Tool
      </Link>

      <div className="mb-8 flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
          <ToolIcon name={tool.icon} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold text-black dark:text-white">{tool.name}</h1>
            <ToolStatusBadge status={tool.status} />
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{tool.description}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Nhóm {tool.category} · {tool.runsCount} lượt chạy · Lần cuối: {formatDateTime(tool.lastRunAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ToolRunner tool={tool} />
        </div>

        <aside className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Lần chạy gần đây của tool này</h2>
            {toolRuns.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tool này chưa có lịch sử chạy. Kết quả lần chạy đầu tiên sẽ hiện ở đây.
              </p>
            ) : (
              <ul className="space-y-4">
                {toolRuns.map((run) => (
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
        </aside>
      </div>
    </div>
  )
}
