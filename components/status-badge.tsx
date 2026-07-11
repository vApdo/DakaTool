import type { RunStatus, ToolStatus } from "@/lib/types"

export function RunStatusBadge({ status }: { status: RunStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--primary-soft)] px-2.5 py-0.5 text-xs font-medium text-primary">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--primary-fill)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--primary-fill)]" />
        </span>
        Đang chạy
      </span>
    )
  }
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Thành công
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Thất bại
    </span>
  )
}

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        Sẵn sàng
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      Bản nháp
    </span>
  )
}
