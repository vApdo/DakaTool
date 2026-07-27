"use client"

import Link from "next/link"
import { ArrowRight, Wrench, PlayCircle, CheckCircle2, FileText } from "lucide-react"
import { RunStatusBadge } from "@/components/status-badge"
import { ToolIcon } from "@/components/tool-icon"
import { AnimatedSection } from "@/components/animated-section"
import { tools, formatDateTime } from "@/lib/data"
import { useRunHistory } from "@/lib/run-history"

/** Nội dung dashboard với số liệu chạy THẬT từ lịch sử trên trình duyệt. */
export function DashboardContent() {
  const runs = useRunHistory()
  const activeTools = tools.filter((t) => t.status === "active")
  const successRate =
    runs.length === 0 ? null : Math.round((runs.filter((r) => r.status === "success").length / runs.length) * 100)

  const countByTool = new Map<string, number>()
  for (const run of runs) countByTool.set(run.toolId, (countByTool.get(run.toolId) ?? 0) + 1)
  const topTools = [...tools]
    .map((t) => ({ tool: t, count: countByTool.get(t.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
  const recentRuns = runs.slice(0, 5)

  const pdfTools = tools.filter((t) => t.category === "PDF" || t.category === "Chứng từ")

  const stats = [
    { label: "Tool sẵn sàng", value: String(activeTools.length), icon: Wrench },
    { label: "Lượt chạy trên trình duyệt này", value: String(runs.length), icon: PlayCircle },
    { label: "Tỷ lệ thành công", value: successRate === null ? "—" : `${successRate}%`, icon: CheckCircle2 },
    { label: "Tool xử lý PDF", value: String(pdfTools.length), icon: FileText },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {stats.map((s, i) => (
          <AnimatedSection key={s.label} delay={0.05 + i * 0.08}>
            <div className="card h-full p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">{s.label}</p>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-3xl font-semibold text-black dark:text-white">{s.value}</p>
            </div>
          </AnimatedSection>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-white">Lần chạy gần đây</h2>
            <Link href="/history" className="btn-secondary text-sm">
              Xem tất cả
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chưa có lần chạy nào trên trình duyệt này. Hãy chạy thử một tool trong nhóm PDF hoặc Chứng từ —
              kết quả sẽ hiện ở đây.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--card-border)]">
              {recentRuns.map((run) => (
                <li key={run.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/tools/${run.toolId}`}
                      className="font-medium text-black hover:text-primary dark:text-white dark:hover:text-primary"
                    >
                      {run.toolName}
                    </Link>
                    <p className="truncate text-sm text-gray-600 dark:text-gray-400">{run.summary}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <RunStatusBadge status={run.status} />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(run.startedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Tool chạy nhiều nhất</h2>
          <ul className="space-y-3">
            {topTools.map(({ tool, count }) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary-soft)] text-primary">
                    <ToolIcon name={tool.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-black dark:text-white">{tool.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{count} lượt chạy</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/tools" className="btn-outline mt-5 w-full justify-center">
            Xem danh sách Tool
          </Link>
        </section>
      </div>
    </>
  )
}
