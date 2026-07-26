"use client"

import { useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { formatVnd, saveCosts, type CostRow } from "@/lib/construction/client"
import type { CostItemDTO } from "@/lib/construction/types"

function totals(items: { estimatedVnd: number; actualVnd: number }[]) {
  return items.reduce(
    (acc, c) => ({ est: acc.est + c.estimatedVnd, act: acc.act + c.actualVnd }),
    { est: 0, act: 0 },
  )
}

/** Chế độ xem (lãnh đạo): bảng dự toán / đã chi / chênh lệch + dòng tổng. */
export function CostView({ items }: { items: CostItemDTO[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-500">Chưa có dữ liệu chi phí.</p>
  const t = totals(items)
  const usedPct = t.est > 0 ? Math.round((t.act / t.est) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800">
              <th className="py-2 pr-3 font-medium">Hạng mục</th>
              <th className="py-2 pr-3 text-right font-medium">Dự toán</th>
              <th className="py-2 pr-3 text-right font-medium">Đã chi</th>
              <th className="py-2 pr-3 text-right font-medium">Còn lại</th>
              <th className="py-2 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const remain = c.estimatedVnd - c.actualVnd
              return (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/60">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatVnd(c.estimatedVnd)}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatVnd(c.actualVnd)}</td>
                  <td
                    className={`py-2 pr-3 text-right font-mono tabular-nums ${remain < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}
                  >
                    {formatVnd(remain)}
                  </td>
                  <td className="py-2 text-xs text-gray-500">{c.note ?? ""}</td>
                </tr>
              )
            })}
            <tr className="font-semibold">
              <td className="py-2.5 pr-3">Tổng cộng</td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatVnd(t.est)}</td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatVnd(t.act)}</td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{formatVnd(t.est - t.act)}</td>
              <td className="py-2.5 text-xs font-normal text-gray-500">Đã dùng {usedPct}% dự toán</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${usedPct > 100 ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${Math.min(100, usedPct)}%` }}
        />
      </div>
    </div>
  )
}

/** Chế độ sửa (quản lý). */
export function CostEditor({
  projectId,
  initial,
  onSaved,
}: {
  projectId: string
  initial: CostItemDTO[]
  onSaved?: () => void
}) {
  const [rows, setRows] = useState<CostRow[]>(
    initial.map((c) => ({
      id: c.id,
      name: c.name,
      estimatedVnd: c.estimatedVnd,
      actualVnd: c.actualVnd,
      note: c.note,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = totals(rows)

  function patch(i: number, data: Partial<CostRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...data } : r)))
    setSaved(false)
  }

  async function save() {
    // Dòng để trống tên sẽ bị xoá khi lưu — chặn lại thay vì âm thầm mất dữ liệu.
    if (rows.some((r) => !r.name.trim())) {
      setError("Có dòng chi phí chưa đặt tên. Nhập tên hoặc bấm thùng rác để xoá dòng đó.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveCosts(projectId, rows)
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
          <div
            key={r.id ?? `new-${i}`}
            className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] dark:border-gray-800"
          >
            <input
              value={r.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              placeholder="Hạng mục chi phí"
              className="rounded-lg border border-gray-300 bg-transparent px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-gray-700"
            />
            <label className="text-xs text-gray-500">
              Dự toán (₫)
              <input
                type="number"
                min={0}
                value={r.estimatedVnd}
                onChange={(e) => patch(i, { estimatedVnd: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-right font-mono text-sm tabular-nums dark:border-gray-700"
              />
            </label>
            <label className="text-xs text-gray-500">
              Đã chi (₫)
              <input
                type="number"
                min={0}
                value={r.actualVnd}
                onChange={(e) => patch(i, { actualVnd: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-2 py-1 text-right font-mono text-sm tabular-nums dark:border-gray-700"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setRows((prev) => prev.filter((_, idx) => idx !== i))
                setSaved(false)
              }}
              aria-label="Xóa dòng"
              className="self-end rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <input
              value={r.note ?? ""}
              onChange={(e) => patch(i, { note: e.target.value })}
              placeholder="Ghi chú"
              className="rounded-lg border border-gray-300 bg-transparent px-2.5 py-1.5 text-sm sm:col-span-4 dark:border-gray-700"
            />
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Tổng dự toán <b className="font-mono tabular-nums">{formatVnd(t.est)}</b> · đã chi{" "}
        <b className="font-mono tabular-nums">{formatVnd(t.act)}</b>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [...prev, { name: "", estimatedVnd: 0, actualVnd: 0, note: null }])
          }
          className="btn-secondary text-sm"
        >
          <Plus className="h-4 w-4" /> Thêm dòng
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu chi phí"}
        </button>
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  )
}
