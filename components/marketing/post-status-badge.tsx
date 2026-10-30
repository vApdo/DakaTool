import { STATUS_LABEL } from "@/lib/marketing/labels"
import type { MktPostStatus } from "@/lib/marketing/types"

const TONE: Record<MktPostStatus, string> = {
  DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  PUBLISHING: "bg-[color:var(--primary-soft)] text-primary",
  SCHEDULED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  PUBLISHED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const DOT: Record<MktPostStatus, string> = {
  DRAFT: "bg-gray-400",
  PENDING_REVIEW: "bg-amber-500",
  REJECTED: "bg-red-500",
  PUBLISHING: "bg-[color:var(--primary-fill)] animate-pulse",
  SCHEDULED: "bg-sky-500",
  PUBLISHED: "bg-emerald-500",
  FAILED: "bg-red-500",
}

export function PostStatusBadge({ status }: { status: MktPostStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}
