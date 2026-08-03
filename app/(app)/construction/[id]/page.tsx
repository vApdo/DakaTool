"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Camera,
  CircleDollarSign,
  Download,
  FileText,
  HardHat,
  ListChecks,
  Settings,
} from "lucide-react"
import { CostView } from "@/components/construction/cost-table"
import { MilestoneSection } from "@/components/construction/milestone-section"
import { UpdateFeed } from "@/components/construction/update-feed"
import { formatVnd, getProject } from "@/lib/construction/client"
import {
  deadlineDeltaDays,
  detailSignals,
  executiveHealth,
  type ExecutiveHealth,
  type ExecutiveSignal,
} from "@/lib/construction/executive-summary"
import type { ConstructionProjectDetailDTO, ConstructionStatusDTO } from "@/lib/construction/types"

const STATUS_LABEL: Record<ConstructionStatusDTO, string> = {
  PLANNING: "Chuẩn bị",
  IN_PROGRESS: "Đang thi công",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
}

const STATUS_CLASS: Record<ConstructionStatusDTO, string> = {
  PLANNING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS: "bg-[color:var(--primary-soft)] text-primary",
  PAUSED: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
}

const HEALTH: Record<ExecutiveHealth, { label: string; className: string }> = {
  risk: {
    label: "Có rủi ro",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  },
  attention: {
    label: "Cần chú ý",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  needs_data: {
    label: "Cần bổ sung dữ liệu",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  },
  on_track: {
    label: "Đúng kế hoạch",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
  },
}

/** Trang báo cáo điều hành dành cho ban lãnh đạo — chỉ xem. */
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
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Không tải được báo cáo công trình</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return <DetailSkeleton />

  const budgetPercent =
    project.totalEstimatedVnd > 0
      ? Math.round((project.totalActualVnd / project.totalEstimatedVnd) * 100)
      : null
  const signals = detailSignals(project)
  const health = executiveHealth(signals)
  const latestUpdate = [...project.updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]
  const completedMilestones = project.milestones.filter((milestone) => milestone.status === "DONE").length

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/construction"
        className="mb-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Tổng quan công trình
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">{project.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[project.status]}`}>
                {STATUS_LABEL[project.status]}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${HEALTH[health].className}`}>
                {HEALTH[health].label}
              </span>
            </div>
            {project.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                {project.description}
              </p>
            )}
          </div>
          <Link href={`/construction/${project.id}/manage`} className="btn-outline min-h-[44px] shrink-0">
            <Settings className="h-4 w-4" />
            Cập nhật dữ liệu
          </Link>
        </div>
      </header>

      <section
        aria-label="Tóm tắt điều hành"
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-200 lg:grid-cols-4 lg:divide-y-0 dark:divide-gray-800">
          <ExecutiveMetric
            icon={HardHat}
            label="Tiến độ tổng"
            value={`${project.overallPercent}%`}
            note={`${completedMilestones}/${project.milestones.length} hạng mục hoàn thành`}
            bar={project.overallPercent}
          />
          <ExecutiveMetric
            icon={CircleDollarSign}
            label="Ngân sách đã dùng"
            value={budgetPercent === null ? "—" : `${budgetPercent}%`}
            note={
              budgetPercent === null
                ? "Chưa có dự toán"
                : `${formatVnd(project.totalActualVnd)} / ${formatVnd(project.totalEstimatedVnd)}`
            }
            bar={budgetPercent === null ? undefined : Math.min(100, budgetPercent)}
            danger={budgetPercent !== null && budgetPercent > 100}
          />
          <ExecutiveMetric
            icon={CalendarDays}
            label="Thời hạn"
            value={deadlineValue(project)}
            note={
              project.targetDate
                ? `Mục tiêu ${formatDate(project.targetDate)}`
                : "Chưa đặt ngày hoàn thành"
            }
            danger={(deadlineDeltaDays(project.targetDate) ?? 0) < 0 && project.status !== "COMPLETED"}
          />
          <ExecutiveMetric
            icon={Camera}
            label="Báo cáo gần nhất"
            value={latestUpdate ? formatDate(latestUpdate.createdAt) : "—"}
            note={latestUpdate ? latestUpdate.authorName || "Không ghi người cập nhật" : "Chưa có báo cáo hiện trường"}
          />
        </div>
      </section>

      <AttentionPanel signals={signals} health={health} />

      <nav
        aria-label="Đi đến nội dung báo cáo"
        className="mt-6 flex gap-2 overflow-x-auto border-y border-gray-200 py-3 dark:border-gray-800"
      >
        <JumpLink href="#updates" icon={Camera} label="Hiện trường" count={project.updates.length} />
        <JumpLink href="#milestones" icon={ListChecks} label="Tiến độ" count={project.milestones.length} />
        <JumpLink href="#costs" icon={CircleDollarSign} label="Chi phí" count={project.costItems.length} />
        <JumpLink href="#files" icon={FileText} label="Tài liệu" count={project.files.length} />
      </nav>

      <Section
        id="updates"
        title="Hình ảnh & báo cáo hiện trường"
        meta={`${project.updates.length} lần cập nhật`}
      >
        <UpdateFeed updates={project.updates} />
      </Section>

      <Section
        id="milestones"
        title="Kế hoạch & tiến độ hạng mục"
        meta={`${completedMilestones}/${project.milestones.length} hoàn thành`}
      >
        <MilestoneSection milestones={project.milestones} />
      </Section>

      <Section
        id="costs"
        title="Ngân sách & chi phí"
        meta={budgetPercent === null ? "Chưa có dự toán" : `Đã dùng ${budgetPercent}%`}
      >
        <CostView items={project.costItems} />
      </Section>

      <Section id="files" title="Tài liệu đính kèm" meta={`${project.files.length} tài liệu`}>
        {project.files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
            Chưa có tài liệu đính kèm.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            {project.files.map((file, index) => (
              <li
                key={file.id}
                className={`flex items-center gap-3 px-3 py-3 text-sm ${
                  index > 0 ? "border-t border-gray-200 dark:border-gray-800" : ""
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate font-medium">{file.filename}</span>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">
                  {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </span>
                <a
                  href={file.url}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-[color:var(--primary-soft)]"
                  aria-label={`Tải ${file.filename}`}
                >
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

function ExecutiveMetric({
  icon: Icon,
  label,
  value,
  note,
  bar,
  danger,
}: {
  icon: typeof HardHat
  label: string
  value: string
  note: string
  bar?: number
  danger?: boolean
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold tabular-nums sm:text-2xl ${
          danger ? "text-red-600 dark:text-red-400" : "text-black dark:text-white"
        }`}
      >
        {value}
      </p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 truncate text-xs text-gray-500" title={note}>
        {note}
      </p>
    </div>
  )
}

function AttentionPanel({ signals, health }: { signals: ExecutiveSignal[]; health: ExecutiveHealth }) {
  if (signals.length === 0) {
    return (
      <section className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <h2 className="font-semibold text-green-800 dark:text-green-300">Không có điểm bất thường</h2>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          Tiến độ, thời hạn và ngân sách hiện không phát sinh cảnh báo.
        </p>
      </section>
    )
  }

  const tone =
    health === "risk"
      ? "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/25"
      : health === "attention"
        ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/25"
        : "border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/25"

  return (
    <section className={`mt-5 rounded-2xl border p-4 sm:p-5 ${tone}`} aria-labelledby="attention-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="attention-title" className="font-semibold text-black dark:text-white">
          Điểm cần chú ý
        </h2>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{signals.length} điểm</span>
      </div>
      <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
        {signals.slice(0, 5).map((signal) => (
          <li key={signal.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              aria-hidden
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                signal.level === "risk"
                  ? "bg-red-500"
                  : signal.level === "warning"
                    ? "bg-amber-500"
                    : "bg-sky-500"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{signal.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-gray-600 dark:text-gray-400">{signal.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {signals.length > 5 && (
        <p className="mt-3 text-xs font-medium text-gray-600 dark:text-gray-400">
          Còn {signals.length - 5} điểm khác trong dữ liệu chi tiết bên dưới.
        </p>
      )}
    </section>
  )
}

function JumpLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string
  icon: typeof HardHat
  label: string
  count: number
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 hover:border-primary hover:text-primary dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300"
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {count}
      </span>
    </a>
  )
}

function Section({
  id,
  title,
  meta,
  children,
}: {
  id: string
  title: string
  meta: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mt-9 scroll-mt-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-black dark:text-white">{title}</h2>
        <span className="text-sm text-gray-500">{meta}</span>
      </div>
      {children}
    </section>
  )
}

function deadlineValue(project: ConstructionProjectDetailDTO): string {
  if (project.status === "COMPLETED") return "Đã hoàn thành"
  const delta = deadlineDeltaDays(project.targetDate)
  if (delta === null) return "—"
  if (delta < 0) return `Trễ ${Math.abs(delta)} ngày`
  if (delta === 0) return "Đến hạn hôm nay"
  return `Còn ${delta} ngày`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-label="Đang tải báo cáo công trình">
      <div className="h-11 w-40 rounded-lg bg-gray-200/70 dark:bg-gray-800" />
      <div className="mt-5 h-10 w-2/3 rounded-lg bg-gray-200/70 dark:bg-gray-800" />
      <div className="mt-6 h-32 rounded-2xl bg-gray-200/70 dark:bg-gray-800" />
      <div className="mt-5 h-48 rounded-2xl bg-gray-200/70 dark:bg-gray-800" />
      <div className="mt-9 h-80 rounded-2xl bg-gray-200/70 dark:bg-gray-800" />
    </div>
  )
}
