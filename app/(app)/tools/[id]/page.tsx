import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ToolIcon } from "@/components/tool-icon"
import { ToolStatusBadge } from "@/components/status-badge"
import { getToolRunner } from "@/components/tool-runner-registry"
import { ToolRunHistory, ToolRunMeta } from "@/components/tool-run-history"
import { getToolById, tools } from "@/lib/data"

export function generateStaticParams() {
  return tools.map((t) => ({ id: t.id }))
}

export default function ToolRunPage({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id)
  if (!tool) notFound()

  // Tool trong danh sách bắt buộc có runner thật — không còn bộ mô phỏng.
  const Runner = getToolRunner(tool.id)
  if (!Runner) notFound()

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
          <ToolRunMeta toolId={tool.id} category={tool.category} />
        </div>
      </div>

      {/* Runner thật tự quản lý layout toàn chiều rộng; lịch sử thật hiện bên dưới. */}
      <div className="space-y-6">
        <Runner tool={tool} />
        <div className="max-w-xl">
          <ToolRunHistory toolId={tool.id} />
        </div>
      </div>
    </div>
  )
}
