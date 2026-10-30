"use client"

import { useEffect, useState } from "react"
import { CalendarClock, CheckCircle2, ExternalLink, KeyRound, LogOut, Send, ShieldCheck, XCircle } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"
import type { MktPostDto } from "@/lib/marketing/types"
import { PostStatusBadge } from "./post-status-badge"
import { formatDateTime, postTimeLabel } from "./format"

const REVIEWER_KEY = "dakatool.mkt.reviewerName"

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ mất phần ghi nhớ tên, không ảnh hưởng thao tác.
  }
}

type ApproverState = { configured: boolean; authorized: boolean } | null

export function ReviewPanel({
  post,
  onChange,
  busy,
  setBusy,
}: {
  post: MktPostDto
  onChange: (post: MktPostDto) => void
  busy: boolean
  setBusy: (busy: boolean) => void
}) {
  const [approver, setApprover] = useState<ApproverState>(null)
  const [code, setCode] = useState("")
  const [reviewerName, setReviewerName] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReviewerName(readStored(REVIEWER_KEY))
    marketingApi.approverStatus().then(setApprover, () => setApprover({ configured: false, authorized: false }))
  }, [])

  const needsReview = post.status === "PENDING_REVIEW" || post.status === "FAILED"
  const canCancel = post.status === "SCHEDULED"
  const needsApprover = needsReview || canCancel

  async function run(task: () => Promise<MktPostDto>) {
    setBusy(true)
    setError(null)
    try {
      onChange(await task())
      setNote("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xử lý được. Vui lòng thử lại.")
    } finally {
      setBusy(false)
    }
  }

  async function login() {
    setBusy(true)
    setError(null)
    try {
      await marketingApi.approverLogin(code)
      setCode("")
      setApprover({ configured: true, authorized: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mã duyệt không đúng.")
    } finally {
      setBusy(false)
    }
  }

  function review(action: "approve" | "reject") {
    const name = reviewerName.trim()
    if (!name) {
      setError("Nhập tên người duyệt.")
      return
    }
    writeStored(REVIEWER_KEY, name)
    void run(() => marketingApi.action(post.id, action, { reviewerName: name, note }))
  }

  return (
    <section className="card p-5" aria-labelledby="review-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="review-title" className="font-semibold text-black dark:text-white">Trạng thái</h2>
        <PostStatusBadge status={post.status} />
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Thời gian</dt>
          <dd className="text-right font-medium">{postTimeLabel(post)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Người soạn</dt>
          <dd className="text-right font-medium">{post.authorName}</dd>
        </div>
        {post.reviewerName && (
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">Người duyệt</dt>
            <dd className="text-right font-medium">{post.reviewerName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Cập nhật</dt>
          <dd className="text-right">{formatDateTime(post.updatedAt)}</dd>
        </div>
      </dl>

      {post.status === "REJECTED" && post.reviewNote && (
        <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <span className="font-semibold">Lý do từ chối:</span> {post.reviewNote}
        </p>
      )}
      {post.status === "FAILED" && post.lastError && (
        <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <span className="font-semibold">Lỗi khi đăng:</span> {post.lastError}
        </p>
      )}
      {post.status === "SCHEDULED" && (
        <p className="mt-4 flex gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-800 dark:text-sky-200">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          Bài đã nằm trong mục “Đã lên lịch” của Fanpage và sẽ tự đăng đúng giờ. Muốn sửa thì huỷ lịch trước.
        </p>
      )}
      {post.permalinkUrl && (
        <a href={post.permalinkUrl} target="_blank" rel="noreferrer" className="btn-outline mt-4 w-full justify-center">
          <ExternalLink className="h-4 w-4" />
          Xem trên Facebook
        </a>
      )}

      {needsApprover && approver && (
        <div className="mt-5 border-t border-[color:var(--card-border)] pt-5">
          {!approver.configured ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chưa đặt mã duyệt. Người quản trị cần thêm biến <code>MKT_APPROVER_CODE</code> trên Vercel.
            </p>
          ) : !approver.authorized ? (
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Dành cho trưởng nhóm
              </p>
              <label htmlFor="mkt-approver-code" className="field-label mt-3">Mã duyệt</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="mkt-approver-code"
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void login()
                  }}
                  autoComplete="off"
                  className="field-input min-h-11 pl-10"
                />
              </div>
              <button
                type="button"
                onClick={() => void login()}
                disabled={busy || code.trim().length < 4}
                className="btn-primary mt-3 min-h-11 w-full justify-center"
              >
                Mở quyền duyệt
              </button>
            </div>
          ) : needsReview ? (
            <div>
              <label htmlFor="mkt-reviewer" className="field-label">Người duyệt</label>
              <input
                id="mkt-reviewer"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="field-input min-h-11"
                maxLength={100}
              />
              <label htmlFor="mkt-note" className="field-label mt-3">Ghi chú <span className="font-normal text-gray-500">(bắt buộc khi từ chối)</span></label>
              <textarea
                id="mkt-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="field-input"
                maxLength={1000}
              />
              <button
                type="button"
                onClick={() => review("approve")}
                disabled={busy}
                className="btn-primary mt-3 min-h-11 w-full justify-center"
              >
                {post.scheduledAt ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {busy ? "Đang gửi lên Facebook..." : post.scheduledAt ? "Duyệt & lên lịch" : "Duyệt & đăng ngay"}
              </button>
              <button
                type="button"
                onClick={() => review("reject")}
                disabled={busy}
                className="btn-outline mt-2 min-h-11 w-full justify-center hover:border-red-500 hover:text-red-600"
              >
                <XCircle className="h-4 w-4" />
                Từ chối
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Huỷ lịch sẽ xoá bài hẹn giờ khỏi Fanpage và đưa bài về nháp. Tiếp tục?")) {
                  void run(() => marketingApi.action(post.id, "cancel"))
                }
              }}
              disabled={busy}
              className="btn-outline min-h-11 w-full justify-center hover:border-red-500 hover:text-red-600"
            >
              <XCircle className="h-4 w-4" />
              Huỷ lịch đăng
            </button>
          )}
          {approver.authorized && (
            <button
              type="button"
              onClick={() => {
                void marketingApi.approverLogout().then(() => setApprover({ configured: true, authorized: false }))
              }}
              className="btn-secondary mt-2 text-xs text-gray-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Thoát quyền duyệt
            </button>
          )}
        </div>
      )}

      {post.status === "PUBLISHED" && (
        <p className="mt-4 flex gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Bài đã lên Fanpage.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </section>
  )
}
