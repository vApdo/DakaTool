"use client"

import { useEffect, useState } from "react"
import { BarChart3, LayoutList, Table2 } from "lucide-react"
import { MilestoneGantt } from "@/components/construction/milestone-gantt"
import { MilestoneView } from "@/components/construction/milestone-table"
import type { MilestoneDTO, MilestoneStatusDTO } from "@/lib/construction/types"
import { TAP } from "@/lib/construction/ui"

/**
 * Khu vực tiến độ hạng mục với ba cách nhìn cùng một dữ liệu:
 *
 * - Danh sách: đọc nhanh trên điện thoại, mỗi hạng mục một thẻ (mặc định).
 * - Gantt: thấy hạng mục nào chồng lấn, cái nào kéo dài, so với hôm nay ra sao.
 * - Bảng: đủ ngày tháng để đối chiếu, hợp khi ngồi máy tính.
 *
 * Lựa chọn được nhớ trong localStorage: lãnh đạo quen nhìn kiểu nào thì mở ra là
 * thấy ngay kiểu đó, không phải chọn lại mỗi lần.
 */

const VIEWS = [
  { id: "list", label: "Danh sách", icon: LayoutList },
  { id: "gantt", label: "Gantt", icon: BarChart3 },
  { id: "table", label: "Bảng", icon: Table2 },
] as const

type ViewId = (typeof VIEWS)[number]["id"]
const STORAGE_KEY = "hqt_milestone_view"

const STATUS_LABEL: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  DELAYED: "Chậm tiến độ",
}
const STATUS_CLASS: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  IN_PROGRESS: "bg-[color:var(--primary-soft)] text-primary",
  DONE: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  DELAYED: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"

export function MilestoneSection({ milestones }: { milestones: MilestoneDTO[] }) {
  const [view, setView] = useState<ViewId>("list")

  // Đọc lựa chọn cũ SAU khi render lần đầu: đọc localStorage lúc dựng state sẽ
  // khiến HTML trên máy chủ và trên trình duyệt khác nhau (lỗi hydration).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && VIEWS.some((v) => v.id === saved)) setView(saved as ViewId)
  }, [])

  function pick(id: ViewId) {
    setView(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Cách hiển thị tiến độ"
        className="mb-3 inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900/40"
      >
        {VIEWS.map((v) => {
          const active = view === v.id
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pick(v.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${TAP} ${
                active
                  ? "accent-fill"
                  : "text-gray-600 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              <v.icon className="h-4 w-4" />
              {v.label}
            </button>
          )
        })}
      </div>

      {view === "list" && <MilestoneView milestones={milestones} />}
      {view === "gantt" && <MilestoneGantt milestones={milestones} />}
      {view === "table" && <MilestoneTableView milestones={milestones} />}
    </div>
  )
}

/** Bảng đầy đủ — cuộn ngang trên điện thoại thay vì bóp chữ đến mức không đọc nổi. */
function MilestoneTableView({ milestones }: { milestones: MilestoneDTO[] }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-gray-500">Chưa có hạng mục nào.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/60">
          <tr>
            <th className="px-3 py-2 font-medium">Hạng mục</th>
            <th className="px-3 py-2 font-medium">Bắt đầu</th>
            <th className="px-3 py-2 font-medium">Kết thúc</th>
            <th className="px-3 py-2 font-medium">Trạng thái</th>
            <th className="px-3 py-2 text-right font-medium">Tiến độ</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800/60">
              <td className="px-3 py-2 font-medium text-black dark:text-white">
                {m.name}
                {m.note && <span className="block text-xs font-normal text-gray-500">{m.note}</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                {fmtDate(m.plannedStart)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                {fmtDate(m.plannedEnd)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[m.status]}`}
                >
                  {STATUS_LABEL[m.status]}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${m.status === "DELAYED" ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono tabular-nums text-gray-600 dark:text-gray-400">
                    {m.percent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
