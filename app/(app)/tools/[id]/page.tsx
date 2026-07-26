import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ToolIcon } from "@/components/tool-icon"
import { ToolStatusBadge } from "@/components/status-badge"
import { getToolRunner, hasCustomRunner } from "@/components/tool-runner-registry"
import { ToolRunHistory, ToolRunMeta } from "@/components/tool-run-history"
import { getToolById, tools } from "@/lib/data"

export function generateStaticParams() {
  return tools.map((t) => ({ id: t.id }))
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id)
  return { title: tool ? tool.name : "Không tìm thấy tool" }
}

export default function ToolRunPage({ params }: { params: { id: string } }) {
  const tool = getToolById(params.id)
  if (!tool) notFound()

  const Runner = getToolRunner(tool.id)
  const custom = hasCustomRunner(tool.id)

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

      {custom ? (
        // Runner thật tự quản lý layout toàn chiều rộng; lịch sử thật hiện bên dưới.
        <div className="space-y-6">
          <Runner tool={tool} />
          <div className="max-w-xl">
            <ToolRunHistory toolId={tool.id} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Runner tool={tool} />
          </div>
          <aside className="lg:col-span-2">
            <ToolRunHistory toolId={tool.id} />
          </aside>
        </div>
      )}
    </div>
  )
}
