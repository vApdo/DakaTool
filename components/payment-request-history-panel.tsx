"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, Copy, Download, Eye, History, Printer, RefreshCw, Trash2 } from "lucide-react"
import { formatVnd } from "@/lib/payment-request"
import {
  deletePaymentHistoryRecord,
  getPaymentHistoryRecord,
  listPaymentHistoryRecords,
} from "@/lib/payment-history/client"
import type { PaymentHistoryRecord, PaymentHistorySummary } from "@/lib/payment-history/types"

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatRequestDate(value: string) {
  const [year, month, day] = value.split("-")
  return day && month && year ? `${day}/${month}/${year}` : value
}

function ActionLabel({ action }: { action: PaymentHistorySummary["action"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
      {action === "download" ? <Download className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
      {action === "download" ? "Tải PDF" : "In"}
    </span>
  )
}

function HistoryDetails({ record }: { record: PaymentHistoryRecord }) {
  return (
    <div className="bg-black/[0.025] px-4 py-4 dark:bg-white/[0.025] sm:px-6">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Ngày đề nghị</dt>
          <dd className="mt-1 font-medium">{formatRequestDate(record.requestDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Người đề nghị</dt>
          <dd className="mt-1 font-medium">{record.requesterName}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Bộ phận</dt>
          <dd className="mt-1 font-medium">{record.department}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Tổng tiền</dt>
          <dd className="mt-1 font-semibold tabular-nums text-primary">{formatVnd(record.totalVnd)} ₫</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-xs text-gray-500 dark:text-gray-400">Công ty</dt>
          <dd className="mt-1 font-medium">{record.companyName}</dd>
          <dd className="mt-0.5 text-gray-600 dark:text-gray-400">{record.data.companyAddress}</dd>
        </div>
        {record.data.paymentContent && (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Nội dung thanh toán</dt>
            <dd className="mt-1 text-gray-700 dark:text-gray-300">{record.data.paymentContent}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--card-border)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-black/[0.025] text-xs text-gray-500 dark:bg-white/[0.025] dark:text-gray-400">
            <tr>
              <th className="px-3 py-2.5 font-medium">Tên hàng hóa / dịch vụ</th>
              <th className="px-3 py-2.5 text-right font-medium">SL</th>
              <th className="px-3 py-2.5 text-right font-medium">Đơn giá</th>
              <th className="px-3 py-2.5 text-right font-medium">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--card-border)]">
            {record.data.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2.5 font-medium">{item.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatVnd(item.quantity)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{formatVnd(item.unitPrice)} ₫</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatVnd(item.quantity * item.unitPrice)} ₫</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PaymentRequestHistoryPanel() {
  const [records, setRecords] = useState<PaymentHistorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PaymentHistoryRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const detailRequest = useRef(0)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await listPaymentHistoryRecords())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được lịch sử phiếu.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  async function toggleDetails(id: string) {
    if (expandedId === id) {
      detailRequest.current += 1
      setExpandedId(null)
      setDetail(null)
      return
    }
    const requestNumber = detailRequest.current + 1
    detailRequest.current = requestNumber
    setExpandedId(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const record = await getPaymentHistoryRecord(id)
      if (detailRequest.current === requestNumber) setDetail(record)
    } catch (reason) {
      if (detailRequest.current !== requestNumber) return
      setError(reason instanceof Error ? reason.message : "Không tải được nội dung phiếu.")
      setExpandedId(null)
    } finally {
      if (detailRequest.current === requestNumber) setDetailLoading(false)
    }
  }

  async function removeRecord(record: PaymentHistorySummary) {
    if (!window.confirm(`Xóa phiếu của ${record.requesterName} tạo lúc ${formatCreatedAt(record.createdAt)}?`)) return
    setDeletingId(record.id)
    setError(null)
    try {
      await deletePaymentHistoryRecord(record.id)
      setRecords((current) => current.filter((item) => item.id !== record.id))
      if (expandedId === record.id) {
        setExpandedId(null)
        setDetail(null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xóa được phiếu.")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="card" aria-label="Đang tải lịch sử phiếu" aria-busy="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-4 border-b border-[color:var(--card-border)] px-5 py-5 last:border-0">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[color:var(--primary-soft)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-72 max-w-full animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error && records.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-10 text-center">
        <RefreshCw className="h-6 w-6 text-red-600 dark:text-red-400" />
        <p className="mt-3 font-medium text-black dark:text-white">Không tải được lịch sử</p>
        <p className="mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <button type="button" onClick={() => void loadRecords()} className="btn-outline mt-4 min-h-11">Thử lại</button>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-primary">
          <History className="h-6 w-6" />
        </span>
        <p className="mt-4 font-medium text-black dark:text-white">Chưa có phiếu thanh toán nào</p>
        <p className="mt-1 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
          Mỗi lần tải PDF hoặc in, DakaTool sẽ lưu một bản dữ liệu để bạn xem và dùng lại sau này.
        </p>
        <Link href="/tools/payment-request" className="btn-primary mt-5 min-h-11">Tạo phiếu đầu tiên</Link>
      </div>
    )
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}

      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--card-border)] text-xs text-gray-500 dark:text-gray-400">
              <th className="px-5 py-3.5 font-medium">Thời điểm lưu</th>
              <th className="px-5 py-3.5 font-medium">Người đề nghị</th>
              <th className="px-5 py-3.5 font-medium">Bộ phận</th>
              <th className="px-5 py-3.5 font-medium">Công ty</th>
              <th className="px-5 py-3.5 text-right font-medium">Tổng tiền</th>
              <th className="px-5 py-3.5 font-medium"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--card-border)]">
            {records.map((record) => (
              <Fragment key={record.id}>
                <tr className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.025]">
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="font-medium">{formatCreatedAt(record.createdAt)}</span>
                    <span className="mt-1 block"><ActionLabel action={record.action} /></span>
                  </td>
                  <td className="px-5 py-4 font-medium">{record.requesterName}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{record.department}</td>
                  <td className="max-w-[230px] px-5 py-4 text-gray-600 dark:text-gray-400"><span className="line-clamp-2">{record.companyName}</span></td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">{formatVnd(record.totalVnd)} ₫</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => void toggleDetails(record.id)} aria-expanded={expandedId === record.id} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring)] dark:hover:bg-white/5">
                        <Eye className="h-4 w-4" /> Xem <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedId === record.id ? "rotate-180" : ""}`} />
                      </button>
                      <Link href={`/tools/payment-request?reuse=${record.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary hover:bg-[color:var(--primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring)]"><Copy className="h-4 w-4" /> Dùng lại</Link>
                      <button type="button" onClick={() => void removeRecord(record)} disabled={deletingId === record.id} aria-label={`Xóa phiếu của ${record.requesterName}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring)] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === record.id && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      {detailLoading || !detail ? <div className="px-6 py-5 text-sm text-gray-500">Đang tải nội dung phiếu...</div> : <HistoryDetails record={detail} />}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card divide-y divide-[color:var(--card-border)] md:hidden">
        {records.map((record) => (
          <article key={record.id}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-black dark:text-white">{record.requesterName}</p>
                  <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">{record.companyName}</p>
                </div>
                <strong className="shrink-0 text-sm tabular-nums text-primary">{formatVnd(record.totalVnd)} ₫</strong>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatCreatedAt(record.createdAt)} · {record.department}</span>
                <ActionLabel action={record.action} />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_1fr_44px] gap-2">
                <button type="button" onClick={() => void toggleDetails(record.id)} aria-expanded={expandedId === record.id} className="btn-outline min-h-11 justify-center px-3"><Eye className="h-4 w-4" /> Xem</button>
                <Link href={`/tools/payment-request?reuse=${record.id}`} className="btn-primary min-h-11 justify-center px-3"><Copy className="h-4 w-4" /> Dùng lại</Link>
                <button type="button" onClick={() => void removeRecord(record)} disabled={deletingId === record.id} aria-label={`Xóa phiếu của ${record.requesterName}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[color:var(--card-border)] text-gray-500 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {expandedId === record.id && (detailLoading || !detail ? <div className="px-4 pb-4 text-sm text-gray-500">Đang tải nội dung phiếu...</div> : <HistoryDetails record={detail} />)}
          </article>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{records.length} phiếu gần nhất · dữ liệu được lưu trong Supabase.</p>
    </div>
  )
}
