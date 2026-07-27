"use client"

import { useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { getAuthStatus, login } from "@/lib/construction/client"
import { INPUT, TAP } from "@/lib/construction/ui"

/**
 * Cổng vào trang quản lý: yêu cầu mã. Lần đầu (chưa ai đặt mã) thì mã nhập vào
 * trở thành mã quản lý của hệ thống.
 */
export function ManagerGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "locked" | "open">("loading")
  const [firstRun, setFirstRun] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthStatus()
      .then((s) => {
        setFirstRun(!s.configured)
        setState(s.authorized ? "open" : "locked")
      })
      .catch(() => setState("locked"))
  }, [])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await login(code)
      setState("open")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mã không đúng.")
    } finally {
      setBusy(false)
    }
  }

  if (state === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (state === "locked") {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
            {firstRun ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </span>
          <h2 className="font-semibold text-black dark:text-white">
            {firstRun ? "Đặt mã quản lý" : "Nhập mã quản lý"}
          </h2>
          <p className="text-xs text-gray-500">
            {firstRun
              ? "Chưa có mã nào. Mã bạn đặt ở đây sẽ dùng cho tất cả quản lý cấp trung."
              : "Trang này dành cho quản lý cấp trung cập nhật tiến độ công trường."}
          </p>
        </div>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
          placeholder="Mã truy cập"
          autoComplete="off"
          className={INPUT}
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || code.length < 4}
          className={`btn-primary mt-3 w-full justify-center disabled:opacity-50 ${TAP}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {firstRun ? "Đặt mã và vào" : "Vào trang quản lý"}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
