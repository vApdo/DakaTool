import { STATUS_LABEL } from "@/lib/marketing/labels"
import type { MktPostStatus } from "@/lib/marketing/types"

const TONE: Record<MktPostStatus, string> = {
  DRAFT: "bg-[#E4E6EB] text-[#65676B] dark:bg-[#3A3B3C] dark:text-[#B0B3B8]",
  PUBLISHING: "bg-[#E7F3FF] text-[#1877F2] dark:bg-[#263951] dark:text-[#2D88FF]",
  SCHEDULED: "bg-[#E7F3FF] text-[#1877F2] dark:bg-[#263951] dark:text-[#2D88FF]",
  PUBLISHED: "bg-[#E6F4EA] text-[#1E7E34] dark:bg-[#1F3A2A] dark:text-[#5DD47A]",
  FAILED: "bg-[#FFEBE9] text-[#C62828] dark:bg-[#4A2224] dark:text-[#FF7B72]",
}

export function PostStatusBadge({ status }: { status: MktPostStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
