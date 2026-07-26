"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, HardHat, Loader2 } from "lucide-react"
import { formatVnd, listProjects } from "@/lib/construction/client"
import type { ConstructionProjectDTO, ConstructionStatusDTO } from "@/lib/construction/types"

const STATUS_LABEL: Record<ConstructionStatusDTO, string> = {
  PLANNING: "Chuẩn bị",
  IN_PROGRESS: "Đang thi công",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
}
const STATUS_CLASS: Record<ConstructionStatusDTO, string> = {
  PLANNING: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-[color:var(--primary-soft)] text-primary",
  PAUSED: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
}

export default function ConstructionListPage() {
  const [projects, setProjects] = useState<ConstructionProjectDTO[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách."))
  }, [])

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
          <HardHat className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">Quản lý công trình</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Theo dõi tiến độ thi công bằng hình ảnh kèm chú thích, kế hoạch hạng mục và dự toán chi phí.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!projects && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {projects && projects.length === 0 && (
        <p className="rounded-2xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
          Chưa có công trình nào.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((p) => (
          <Link
            key={p.id}
            href={`/construction/${p.id}`}
            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-primary dark:border-gray-800 dark:bg-gray-900/40"
          >
            <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-800">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverUrl}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <HardHat className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-black dark:text-white">{p.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.overallPercent}%` }} />
                </div>
                <span className="font-mono text-xs tabular-nums text-gray-500">{p.overallPercent}%</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Chi phí: <span className="font-mono tabular-nums">{formatVnd(p.totalActualVnd)}</span> /{" "}
                <span className="font-mono tabular-nums">{formatVnd(p.totalEstimatedVnd)}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-400">{p.updateCount} lần cập nhật</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
