"use client"

import { useState } from "react"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { formatVnd, saveCosts, type CostRow } from "@/lib/construction/client"
import type { CostItemDTO } from "@/lib/construction/types"
import {
  groupDigits,
  humanVnd,
  ICON_BTN,
  INPUT,
  INPUT_NUM,
  LABEL,
  parseDigits,
  STICKY_BAR,
  TAP,
} from "@/lib/construction/ui"

function totals(items: { estimatedVnd: number; actualVnd: number }[]) {
  return items.reduce(
    (acc, c) => ({ est: acc.est + c.estimatedVnd, act: acc.act + c.actualVnd }),
    { est: 0, act: 0 },
  )
}

/**
 * Chế độ xem (lãnh đạo).
 * - Mobile: danh sách thẻ (bảng 4 cột số tiền không thể vừa màn 390px, ép vuốt ngang).
 * - Từ 640px: bảng đầy đủ như cũ.
 */
export function CostView({ items }: { items: CostItemDTO[] }) {
  if (items.length === 0) return <p className="text-sm text-gray-500">Chưa có dữ liệu chi phí.</p>
  const t = totals(items)
  const usedPct = t.est > 0 ? Math.round((t.act / t.est) * 100) : 0

  return (
    <div className="space-y-3">
      {/* --- Mobile: thẻ từng hạng mục --- */}
      <div className="space-y-2 sm:hidden">
        {items.map((c) => {
          const pct = c.estimatedVnd > 0 ? Math.round((c.actualVnd / c.estimatedVnd) * 100) : 0
          const over = c.actualVnd > c.estimatedVnd
          return (
            <div key={c.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <div className="flex items-start gap-2">
                <span className="font-medium text-black dark:text-white">{c.name}</span>
                <span
                  className={`ml-auto shrink-0 font-mono text-sm tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}
                >
                  {pct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400">
                {formatVnd(c.actualVnd)} / {formatVnd(c.estimatedVnd)}
              </p>
              {c.note && <p className="mt-1 text-xs text-gray-500">{c.note}</p>}
            </div>
          )
        })}
        <div className="rounded-xl bg-[color:var(--primary-soft)] p-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-black dark:text-white">Tổng cộng</span>
            <span className="ml-auto font-mono text-sm tabular-nums text-gray-600 dark:text-gray-400">
              đã dùng {usedPct}%
            </span>
          </div>
          <p className="mt-1 font-mono text-sm tabular-nums">
            {formatVnd(t.act)} / {formatVnd(t.est)}
          </p>
        </div>
      </div>

      {/* --- Từ 640px: bảng đầy đủ --- */}
      <div className="hidden overflow-x-auto sm:block">
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

      <div className="hidden h-2 overflow-hidden rounded-full bg-gray-200 sm:block dark:bg-gray-800">
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
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = totals(rows)

  function patch(i: number, data: Partial<CostRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...data } : r)))
    setSaved(false)
    setDirty(true)
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
                placeholder="Hạng mục chi phí"
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== i))
                  setSaved(false)
                  setDirty(true)
                }}
                aria-label={`Xoá dòng ${r.name || i + 1}`}
                className={ICON_BTN}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MoneyField
                label="Dự toán"
                value={r.estimatedVnd}
                onChange={(v) => patch(i, { estimatedVnd: v })}
              />
              <MoneyField
                label="Đã chi"
                value={r.actualVnd}
                onChange={(v) => patch(i, { actualVnd: v })}
              />
            </div>

            <input
              value={r.note ?? ""}
              onChange={(e) => patch(i, { note: e.target.value })}
              placeholder="Ghi chú"
              className={`${INPUT} mt-2`}
            />
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Tổng dự toán <b className="font-mono tabular-nums">{formatVnd(t.est)}</b> · đã chi{" "}
        <b className="font-mono tabular-nums">{formatVnd(t.act)}</b>
      </p>

      <button
        type="button"
        onClick={() => {
          setRows((prev) => [...prev, { name: "", estimatedVnd: 0, actualVnd: 0, note: null }])
          setDirty(true)
        }}
        className={`btn-secondary w-full justify-center text-sm sm:w-auto ${TAP}`}
      >
        <Plus className="h-4 w-4" /> Thêm dòng
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
          {saving ? "Đang lưu…" : saved ? "Đã lưu" : "Lưu chi phí"}
        </button>
        {dirty && !saving && (
          <span className="text-xs text-gray-500">Có thay đổi chưa lưu</span>
        )}
      </div>
    </div>
  )
}

/**
 * Ô nhập tiền: hiển thị dấu chấm phân cách khi gõ và một dòng "đọc hiểu"
 * (≈ 2,5 tỷ ₫) để soát nhanh xem có thừa/thiếu số 0 — lỗi hay gặp nhất khi gõ
 * số tiền 10 chữ số trên bàn phím điện thoại.
 */
function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label} (₫)</span>
      <input
        type="text"
        inputMode="numeric"
        value={groupDigits(value)}
        onChange={(e) => onChange(parseDigits(e.target.value))}
        className={`${INPUT_NUM} mt-1`}
      />
      <span className="mt-1 block text-right text-xs text-gray-500">{humanVnd(value)}</span>
    </label>
  )
}
