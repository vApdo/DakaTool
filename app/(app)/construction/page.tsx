"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  HardHat,
  ImageIcon,
} from "lucide-react"
import { formatVnd, listProjects } from "@/lib/construction/client"
import {
  deadlineDeltaDays,
  executiveHealth,
  projectSignals,
  type ExecutiveHealth,
} from "@/lib/construction/executive-summary"
import type { ConstructionProjectDTO, ConstructionStatusDTO } from "@/lib/construction/types"

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

const HEALTH: Record<ExecutiveHealth, { label: string; className: string; rank: number }> = {
  risk: {
    label: "Rủi ro",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    rank: 0,
  },
  attention: {
    label: "Cần chú ý",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    rank: 1,
  },
  needs_data: {
    label: "Thiếu dữ liệu",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    rank: 2,
  },
  on_track: {
    label: "Đúng kế hoạch",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
    rank: 3,
  },
}

export default function ConstructionListPage() {
  const [projects, setProjects] = useState<ConstructionProjectDTO[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách."))
  }, [])

  const rankedProjects = projects
    ? [...projects].sort((a, b) => {
        const aRank = HEALTH[executiveHealth(projectSignals(a))].rank
        const bRank = HEALTH[executiveHealth(projectSignals(b))].rank
        return aRank - bRank
      })
    : []

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">
              Tổng quan công trình
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              Tiến độ, ngân sách và những điểm cần ban lãnh đạo chú ý trên một màn hình.
            </p>
          </div>
          {projects && projects.length > 0 && (
            <p className="text-sm text-gray-500">Ưu tiên hiển thị công trình có rủi ro trước</p>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Không tải được dữ liệu công trình</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {!projects && !error && <ConstructionSkeleton />}

      {projects && projects.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-4 py-14 text-center dark:border-gray-700">
          <HardHat className="h-9 w-9 text-gray-400" />
          <h2 className="mt-3 font-semibold text-black dark:text-white">Chưa có công trình nào</h2>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            Khi quản lý tạo công trình, tiến độ và ngân sách tổng hợp sẽ xuất hiện tại đây.
          </p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <>
          <PortfolioSummary projects={projects} />

          <section aria-labelledby="project-list-title" className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="project-list-title" className="text-lg font-semibold text-black dark:text-white">
                Danh mục công trình
              </h2>
              <span className="text-sm text-gray-500">{projects.length} công trình</span>
            </div>
            <div className="space-y-4">
              {rankedProjects.map((project) => (
                <ProjectExecutiveRow key={project.id} project={project} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function PortfolioSummary({ projects }: { projects: ConstructionProjectDTO[] }) {
  const totalEstimated = projects.reduce((sum, project) => sum + project.totalEstimatedVnd, 0)
  const totalActual = projects.reduce((sum, project) => sum + project.totalActualVnd, 0)
  const averageProgress = Math.round(
    projects.reduce((sum, project) => sum + project.overallPercent, 0) / projects.length,
  )
  const active = projects.filter((project) => project.status === "IN_PROGRESS").length
  const needAttention = projects.filter(
    (project) => executiveHealth(projectSignals(project)) !== "on_track",
  ).length

  return (
    <section
      aria-label="Tổng hợp danh mục"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
    >
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-200 sm:grid-cols-4 sm:divide-y-0 dark:divide-gray-800">
        <PortfolioMetric label="Đang thi công" value={`${active}/${projects.length}`} note="công trình" />
        <PortfolioMetric label="Tiến độ bình quân" value={`${averageProgress}%`} note="toàn danh mục" />
        <PortfolioMetric
          label="Cần chú ý"
          value={String(needAttention)}
          note={needAttention > 0 ? "gồm cả dữ liệu còn thiếu" : "không có cảnh báo"}
          danger={needAttention > 0}
        />
        <PortfolioMetric
          label="Ngân sách đã dùng"
          value={totalEstimated > 0 ? `${Math.round((totalActual / totalEstimated) * 100)}%` : "—"}
          note={totalEstimated > 0 ? `${formatVnd(totalActual)} / ${formatVnd(totalEstimated)}` : "Chưa có dự toán"}
          danger={totalEstimated > 0 && totalActual > totalEstimated}
        />
      </div>
    </section>
  )
}

function PortfolioMetric({
  label,
  value,
  note,
  danger,
}: {
  label: string
  value: string
  note: string
  danger?: boolean
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          danger ? "text-amber-700 dark:text-amber-300" : "text-black dark:text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-gray-500" title={note}>
        {note}
      </p>
    </div>
  )
}

function ProjectExecutiveRow({ project }: { project: ConstructionProjectDTO }) {
  const signals = projectSignals(project)
  const health = executiveHealth(signals)
  const budgetPercent =
    project.totalEstimatedVnd > 0
      ? Math.round((project.totalActualVnd / project.totalEstimatedVnd) * 100)
      : null

  return (
    <Link
      href={`/construction/${project.id}`}
      className="group grid overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:grid-cols-[220px_minmax(0,1fr)] dark:border-gray-800 dark:bg-gray-900/40 dark:focus-visible:ring-offset-gray-950"
    >
      <div className="aspect-[16/9] bg-gray-100 md:aspect-auto md:min-h-[210px] dark:bg-gray-800">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverUrl}
            alt={`Ảnh mới nhất của ${project.name}`}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon className="h-7 w-7" />
            <span className="text-xs">Chưa có ảnh hiện trường</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-black group-hover:text-primary dark:text-white">
              {project.name}
            </h3>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-400">
                {project.description}
              </p>
            )}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[project.status]}`}>
            {STATUS_LABEL[project.status]}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${HEALTH[health].className}`}>
            {HEALTH[health].label}
          </span>
        </div>

        {signals[0] && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60">
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                signals[0].level === "risk"
                  ? "text-red-600 dark:text-red-400"
                  : signals[0].level === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-sky-600 dark:text-sky-400"
              }`}
            />
            <span className="font-medium text-gray-800 dark:text-gray-200">{signals[0].title}</span>
            {signals.length > 1 && (
              <span className="ml-auto shrink-0 text-xs text-gray-500">+{signals.length - 1} điểm khác</span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <ProjectMetric label="Tiến độ" value={`${project.overallPercent}%`} icon={HardHat} />
          <ProjectMetric
            label="Ngân sách"
            value={budgetPercent === null ? "Chưa có" : `${budgetPercent}%`}
            icon={CircleDollarSign}
            danger={budgetPercent !== null && budgetPercent > 100}
          />
          <ProjectMetric
            label="Thời hạn"
            value={deadlineLabel(project)}
            icon={CalendarDays}
            danger={(deadlineDeltaDays(project.targetDate) ?? 0) < 0 && project.status !== "COMPLETED"}
          />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            role="progressbar"
            aria-label={`Tiến độ ${project.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={project.overallPercent}
            className="h-full rounded-full bg-primary"
            style={{ width: `${project.overallPercent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>{project.updateCount} báo cáo hiện trường</span>
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
            Xem báo cáo <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function ProjectMetric({
  label,
  value,
  icon: Icon,
  danger,
}: {
  label: string
  value: string
  icon: typeof HardHat
  danger?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] text-gray-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          danger ? "text-red-600 dark:text-red-400" : "text-black dark:text-white"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function deadlineLabel(project: ConstructionProjectDTO): string {
  if (project.status === "COMPLETED") return "Đã xong"
  const delta = deadlineDeltaDays(project.targetDate)
  if (delta === null) return "Chưa có"
  if (delta < 0) return `Trễ ${Math.abs(delta)} ngày`
  if (delta === 0) return "Hôm nay"
  return `Còn ${delta} ngày`
}

function ConstructionSkeleton() {
  return (
    <div aria-label="Đang tải dữ liệu công trình" className="animate-pulse space-y-7">
      <div className="h-28 rounded-2xl bg-gray-200/70 dark:bg-gray-800" />
      <div className="space-y-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-56 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
          />
        ))}
      </div>
    </div>
  )
}
