"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Facebook, KeyRound, Unplug } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"
import type { MktConnectionDto } from "@/lib/marketing/types"
import { formatDateTime } from "./format"

/** Thông báo sau khi Facebook chuyển về trang Marketing (`?fb=...`, xem lib/marketing/oauth.ts). */
const RESULT_MESSAGE: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Đã kết nối Facebook." },
  cancelled: { tone: "warn", text: "Bạn đã huỷ đăng nhập Facebook, chưa có gì thay đổi." },
  no_pages: {
    tone: "warn",
    text: "Tài khoản này không có Fanpage nào được phép đăng bài, hoặc bạn chưa tích chọn Fanpage khi Facebook hỏi. Hãy kết nối lại.",
  },
  need_approver: { tone: "warn", text: "Cần nhập mã duyệt trước khi kết nối Facebook." },
  not_configured: { tone: "warn", text: "Chưa cấu hình ứng dụng Facebook (FB_APP_ID, FB_APP_SECRET)." },
  failed: { tone: "warn", text: "Kết nối Facebook không thành công. Vui lòng thử lại." },
}

type ApproverState = { configured: boolean; authorized: boolean }

export function FacebookConnection() {
  const [connection, setConnection] = useState<MktConnectionDto | null>(null)
  const [approver, setApprover] = useState<ApproverState | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fb = params.get("fb")
    if (fb && RESULT_MESSAGE[fb]) {
      setResult(fb)
      params.delete("fb")
      const query = params.toString()
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
    }
    marketingApi.pages().then(setConnection, (reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Không tải được trạng thái kết nối Facebook."),
    )
    marketingApi.approverStatus().then(setApprover, () => setApprover({ configured: false, authorized: false }))
  }, [])

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

  async function disconnect() {
    if (!window.confirm("Ngắt kết nối mọi Fanpage? Bài đã hẹn giờ trên Facebook vẫn tự đăng, nhưng DakaTool sẽ không đăng hay huỷ lịch được nữa cho tới khi kết nối lại.")) return
    setBusy(true)
    setError(null)
    try {
      await marketingApi.disconnectFacebook()
      setConnection((current) => current && { ...current, pages: [], connectedBy: null, connectedAt: null })
      setResult(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không ngắt kết nối được.")
    } finally {
      setBusy(false)
    }
  }

  if (!connection || !approver) {
    return error ? <p role="alert" className="card mb-6 p-4 text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null
  }

  const connected = connection.pages.length > 0
  const message = result ? RESULT_MESSAGE[result] : null

  return (
    <section className="card mb-6 p-5 sm:p-6" aria-label="Kết nối Facebook">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
            <Facebook className="h-4 w-4 text-primary" />
            {connected ? `Đã kết nối ${connection.pages.length} Fanpage` : "Chưa kết nối Facebook"}
          </p>
          {connected ? (
            <>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {connection.pages.map((page) => page.name).join(", ")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Qua tài khoản {connection.connectedBy}
                {connection.connectedAt && ` · ${formatDateTime(connection.connectedAt)}`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Trưởng nhóm đăng nhập Facebook một lần bằng tài khoản đang quản lý Fanpage, rồi chọn các Fanpage cho phép DakaTool đăng bài.
            </p>
          )}
        </div>

        {connection.configured && approver.authorized && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href={marketingApi.connectUrl} className={connected ? "btn-outline min-h-11" : "btn-primary min-h-11"}>
              <Facebook className="h-4 w-4" />
              {connected ? "Kết nối lại" : "Kết nối Facebook"}
            </a>
            {connected && (
              <button type="button" onClick={() => void disconnect()} disabled={busy} className="btn-outline min-h-11">
                <Unplug className="h-4 w-4" />
                Ngắt kết nối
              </button>
            )}
          </div>
        )}
      </div>

      {!connection.configured && (
        <p className="mt-4 flex gap-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Người quản trị cần đặt FB_APP_ID và FB_APP_SECRET trên Vercel (xem docs/marketing-setup.md).
        </p>
      )}

      {connection.configured && !approver.authorized && (
        approver.configured ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <label htmlFor="mkt-connect-code" className="field-label">Mã duyệt để {connected ? "kết nối lại" : "kết nối"}</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="mkt-connect-code"
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
            </div>
            <button type="button" onClick={() => void login()} disabled={busy || code.trim().length < 4} className="btn-outline min-h-11">
              Mở quyền duyệt
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Chưa đặt mã duyệt. Người quản trị cần thêm biến <code>MKT_APPROVER_CODE</code> trên Vercel.
          </p>
        )
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 flex gap-2 text-sm ${message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200"}`}
        >
          {message.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {message.text}
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </section>
  )
}
