"use client"

import { useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { saveMilestones, type MilestoneRow } from "@/lib/construction/client"
import type { MilestoneDTO, MilestoneStatusDTO } from "@/lib/construction/types"

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

const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "")
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"

/** Chế độ xem (lãnh đạo): bảng chỉ đọc kèm thanh %. */
export function MilestoneView({ milestones }: { milestones: MilestoneDTO[] }) {
  if (milestones.length === 0) {
    return <p className="text-sm text-gray-500">Chưa có hạng mục nào.</p>
  }
  return (
    <div className="space-y-2.5">
      {milestones.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-black dark:text-white">{m.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[m.status]}`}>
              {STATUS_LABEL[m.status]}
            </span>
            <span className="ml-auto font-mono text-sm tabular-nums text-gray-600 dark:text-gray-400">
              {m.percent}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${m.status === "DELAYED" ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${m.percent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-gray-500">
            <span>Kế hoạch: {fmtDate(m.plannedStart)} → {fmtDate(m.plannedEnd)}</span>
            {m.note && <span>Ghi chú: {m.note}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Chế độ sửa (quản lý): thêm/xóa/sửa dòng rồi Lưu một lần. */
export function MilestoneEditor({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string
  initial: MilestoneDTO[]
  onSaved?: () => void
}) {
  const [rows, setRows] = useState<MilestoneRow[]>(
    initial.map((m) => ({
      id: m.id,
      name: m.name,
      plannedStart: m.plannedStart,
      plannedEnd: m.plannedEnd,
      status: m.status,
      percent: m.percent,
      note: m.note,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(i: number, data: Partial<MilestoneRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...data } : r)))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveMilestones(
        projectId,
        rows.filter((r) => r.name.trim()),
      )
      setSaved(true)
      onSaved?.()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex gap-2">
              <input
                value={r.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Tên hạng mục (vd: Đổ móng)"
                className="flex-1 rounded-lg border border-gray-300 bg-transparent px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-gray-700"
              />
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== i))
                  setSaved(false)
                }}
                aria-label="Xóa hạng mục"
                className="rounded-lg px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="text-xs text-gray-500">
                Bắt đầu
                <input
                  type="date"
                  value={dateOnly(r.plannedStart ?? null)}
                  onChange={(e) => patch(i, { plannedStart: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                />
              </label>
              <label className="text-xs text-gray-500">
                Kết thúc
                <input
                  type="date"
                  value={dateOnly(r.plannedEnd ?? null)}
                  onChange={(e) => patch(i, { plannedEnd: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                />
              </label>
              <label className="text-xs text-gray-500">
                Trạng thái
                <select
                  value={r.status}
                  onChange={(e) => patch(i, { status: e.target.value as MilestoneStatusDTO })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                >
                  {(Object.keys(STATUS_LABEL) as MilestoneStatusDTO[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-500">
                Hoàn thành ({r.percent}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={r.percent}
                  onChange={(e) => patch(i, { percent: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </label>
            </div>
            <input
              value={r.note ?? ""}
              onChange={(e) => patch(i, { note: e.target.value })}
              placeholder="Ghi chú (tuỳ chọn)"
              className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-2.5 py-1.5 text-sm dark:border-gray-700"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { name: "", plannedStart: null, plannedEnd: null, status: "NOT_STARTED", percent: 0, note: null },
            ])
          }
          className="btn-secondary text-sm"
        >
          <Plus className="h-4 w-4" /> Thêm hạng mục
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu tiến độ"}
        </button>
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  )
}
