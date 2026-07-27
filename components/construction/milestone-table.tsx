"use client"

import { useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { saveMilestones, type MilestoneRow } from "@/lib/construction/client"
import type { MilestoneDTO, MilestoneStatusDTO } from "@/lib/construction/types"
import { ICON_BTN, INPUT, LABEL, STICKY_BAR, TAP } from "@/lib/construction/ui"

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

/** Mốc % bấm nhanh — kéo thanh trượt trên điện thoại rất khó dừng đúng số. */
const QUICK_PCT = [0, 25, 50, 75, 100] as const

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
        <div key={m.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
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

/** Chế độ sửa (quản lý): mỗi hạng mục một thẻ, tối ưu thao tác một tay. */
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
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(i: number, data: Partial<MilestoneRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...data } : r)))
    setSaved(false)
    setDirty(true)
  }

  async function save() {
    // Dòng để trống tên sẽ bị xoá khi lưu — chặn lại thay vì âm thầm mất dữ liệu.
    if (rows.some((r) => !r.name.trim())) {
      setError("Có hạng mục chưa đặt tên. Nhập tên hoặc bấm thùng rác để xoá dòng đó.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveMilestones(projectId, rows)
      setSaved(true)
      setDirty(false)
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
          <div
            key={r.id ?? `new-${i}`}
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
              <input
                value={r.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Tên hạng mục (vd: Đổ móng)"
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== i))
                  setSaved(false)
                  setDirty(true)
                }}
                aria-label={`Xoá hạng mục ${r.name || i + 1}`}
                className={ICON_BTN}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Ngày ngắn nên giữ 2 cột kể cả trên mobile. */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL}>Bắt đầu</span>
                <input
                  type="date"
                  value={dateOnly(r.plannedStart ?? null)}
                  onChange={(e) => patch(i, { plannedStart: e.target.value || null })}
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block">
                <span className={LABEL}>Kết thúc</span>
                <input
                  type="date"
                  value={dateOnly(r.plannedEnd ?? null)}
                  onChange={(e) => patch(i, { plannedEnd: e.target.value || null })}
                  className={`${INPUT} mt-1`}
                />
              </label>
            </div>

            <label className="mt-2 block">
              <span className={LABEL}>Trạng thái</span>
              <select
                value={r.status}
                onChange={(e) => patch(i, { status: e.target.value as MilestoneStatusDTO })}
                className={`${INPUT} mt-1`}
              >
                {(Object.keys(STATUS_LABEL) as MilestoneStatusDTO[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3">
              <span className={LABEL}>
                Hoàn thành <b className="font-mono tabular-nums text-primary">{r.percent}%</b>
              </span>
              {/* Bấm mốc nhanh: chính xác hơn kéo thanh trượt bằng ngón tay. */}
              <div className="mt-1.5 flex gap-1.5">
                {QUICK_PCT.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => patch(i, { percent: p })}
                    className={`h-11 flex-1 rounded-lg border text-sm font-medium transition ${
                      r.percent === p
                        ? "border-primary bg-[color:var(--primary-soft)] text-primary"
                        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={r.percent}
                onChange={(e) => patch(i, { percent: Number(e.target.value) })}
                aria-label={`Phần trăm hoàn thành ${r.name}`}
                className="mt-2 w-full"
              />
            </div>

            <input
              value={r.note ?? ""}
              onChange={(e) => patch(i, { note: e.target.value })}
              placeholder="Ghi chú (tuỳ chọn)"
              className={`${INPUT} mt-2`}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setRows((prev) => [
            ...prev,
            { name: "", plannedStart: null, plannedEnd: null, status: "NOT_STARTED", percent: 0, note: null },
          ])
          setDirty(true)
        }}
        className={`btn-secondary w-full justify-center text-sm sm:w-auto ${TAP}`}
      >
        <Plus className="h-4 w-4" /> Thêm hạng mục
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={STICKY_BAR}>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`btn-primary flex-1 justify-center text-sm disabled:opacity-50 sm:flex-none ${TAP}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu tiến độ"}
        </button>
        {dirty && !saving && <span className="text-xs text-gray-500">Có thay đổi chưa lưu</span>}
      </div>
    </div>
  )
}
