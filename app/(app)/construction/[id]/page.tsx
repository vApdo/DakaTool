"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Download, FileText, Loader2, Settings } from "lucide-react"
import { CostView } from "@/components/construction/cost-table"
import { MilestoneSection } from "@/components/construction/milestone-section"
import { UpdateFeed } from "@/components/construction/update-feed"
import { formatVnd, getProject } from "@/lib/construction/client"
import type { ConstructionProjectDetailDTO, ConstructionStatusDTO } from "@/lib/construction/types"

const STATUS_LABEL: Record<ConstructionStatusDTO, string> = {
  PLANNING: "Chuẩn bị",
  IN_PROGRESS: "Đang thi công",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
}

function daysLeft(target: string | null): string {
  if (!target) return "—"
  const diff = Math.ceil((new Date(target).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return `Trễ ${Math.abs(diff)} ngày`
  return `${diff} ngày`
}

/** Trang theo dõi dành cho ban lãnh đạo — chỉ xem. */
export default function ConstructionDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ConstructionProjectDetailDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProject(params.id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được công trình."))
  }, [params.id])

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="h-4 w-4" />
        {error}
      </div>
    )
  }
  if (!project) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const budgetPct =
    project.totalEstimatedVnd > 0
      ? Math.round((project.totalActualVnd / project.totalEstimatedVnd) * 100)
      : 0

  return (
    <div>
      <Link href="/construction" className="btn-secondary mb-6 text-gray-600 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Danh sách công trình
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">{project.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {STATUS_LABEL[project.status]}
            {project.description ? ` · ${project.description}` : ""}
          </p>
        </div>
        <Link href={`/construction/${project.id}/manage`} className="btn-secondary text-sm">
          <Settings className="h-4 w-4" />
          Trang quản lý
        </Link>
      </div>

      {/* Ba số tổng quan.
          Mobile: một thẻ 3 cột gọn — ba thẻ lớn xếp dọc chiếm gần trọn màn hình đầu,
          đẩy ảnh công trường (thứ lãnh đạo cần xem nhất) xuống quá sâu.
          Từ 640px: ba thẻ riêng như cũ. */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-3 sm:hidden dark:border-gray-800 dark:bg-gray-900/40">
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800">
          <MiniStat label="Tiến độ" value={`${project.overallPercent}%`} />
          <MiniStat label="Ngân sách" value={`${budgetPct}%`} danger={budgetPct > 100} />
          <MiniStat label="Còn lại" value={daysLeft(project.targetDate)} small />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div className="h-full rounded-full bg-primary" style={{ width: `${project.overallPercent}%` }} />
        </div>
        <p className="mt-2 text-center font-mono text-xs tabular-nums text-gray-500">
          {formatVnd(project.totalActualVnd)} / {formatVnd(project.totalEstimatedVnd)}
        </p>
      </div>

      <div className="mb-8 hidden gap-3 sm:grid sm:grid-cols-3">
        <StatCard label="Tiến độ tổng" value={`${project.overallPercent}%`} bar={project.overallPercent} />
        <StatCard
          label="Ngân sách đã dùng"
          value={`${budgetPct}%`}
          sub={`${formatVnd(project.totalActualVnd)} / ${formatVnd(project.totalEstimatedVnd)}`}
          bar={Math.min(100, budgetPct)}
          danger={budgetPct > 100}
        />
        <StatCard label="Thời hạn còn lại" value={daysLeft(project.targetDate)} sub={
          project.targetDate
            ? `Mục tiêu: ${new Date(project.targetDate).toLocaleDateString("vi-VN")}`
            : "Chưa đặt mốc hoàn thành"
        } />
      </div>

      <Section title="Nhật ký hình ảnh công trường">
        <UpdateFeed updates={project.updates} />
      </Section>

      <Section title="Kế hoạch & tiến độ hạng mục">
        <MilestoneSection milestones={project.milestones} />
      </Section>

      <Section title="Dự toán chi phí">
        <CostView items={project.costItems} />
      </Section>

      <Section title="Tài liệu đính kèm">
        {project.files.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có tài liệu.</p>
        ) : (
          <ul className="space-y-2">
            {project.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{f.filename}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  {(f.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </span>
                <a href={f.url} className="shrink-0 text-primary hover:underline" aria-label={`Tải ${f.filename}`}>
                  <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

/** Ô số liệu gọn cho mobile (3 ô cùng một hàng). */
function MiniStat({
  label,
  value,
  danger,
  small,
}: {
  label: string
  value: string
  danger?: boolean
  small?: boolean
}) {
  return (
    <div className="px-1 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold tabular-nums ${small ? "text-sm" : "text-xl"} ${
          danger ? "text-red-600 dark:text-red-400" : "text-black dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  bar,
  danger,
}: {
  label: string
  value: string
  sub?: string
  bar?: number
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-black dark:text-white">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-1.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">{title}</h2>
      {children}
    </section>
  )
}
