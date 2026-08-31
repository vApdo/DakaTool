"use client"

import { useEffect, useState, type ReactNode } from "react"
import { KeyRound, LockKeyhole, ShieldAlert } from "lucide-react"

type GateState = "loading" | "locked" | "open" | "unconfigured"
type AuthStatus = { configured: boolean; authorized: boolean }
type ErrorPayload = { error?: { message?: string } }

export function AccessGate({ children }: { children: ReactNode }) {
  const [gateState, setGateState] = useState<GateState>("loading")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/access", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as AuthStatus & ErrorPayload
        if (!response.ok) throw new Error(payload.error?.message ?? "Không kiểm tra được quyền truy cập.")
        return payload
      })
      .then((status) => {
        if (!active) return
        setGateState(status.authorized ? "open" : status.configured ? "locked" : "unconfigured")
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Không kiểm tra được quyền truy cập.")
        setGateState("locked")
      })
    return () => {
      active = false
    }
  }, [])

  async function submit() {
    if (busy || code.trim().length < 4) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const payload = (await response.json().catch(() => ({}))) as ErrorPayload
      if (!response.ok) throw new Error(payload.error?.message ?? "Mã truy cập không đúng.")
      setCode("")
      setGateState("open")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mã truy cập không đúng.")
    } finally {
      setBusy(false)
    }
  }

  if (gateState === "open") return <>{children}</>

  if (gateState === "loading") {
    return (
      <div className="mx-auto max-w-md" aria-label="Đang kiểm tra quyền truy cập" aria-busy="true">
        <div className="card space-y-4 p-6">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-[color:var(--primary-soft)]" />
          <div className="h-5 w-44 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
          <div className="h-11 w-full animate-pulse rounded-md bg-black/[0.06] dark:bg-white/[0.06]" />
        </div>
      </div>
    )
  }

  if (gateState === "unconfigured") {
    return (
      <div className="mx-auto max-w-md card p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-semibold text-black dark:text-white">Chưa cấu hình mã truy cập</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
          Thêm biến <code>DAKATOOL_ACCESS_CODE</code> trong Vercel rồi triển khai lại để bảo vệ dữ liệu nội bộ.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-primary">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-black dark:text-white">Khu vực nội bộ</h2>
          <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
            Nhập mã DakaTool để mở biểu mẫu và lịch sử đã lưu. Phiên đăng nhập được giữ trong 30 ngày.
          </p>
        </div>
      </div>
      <label htmlFor="dakatool-access-code" className="field-label mt-5">Mã truy cập</label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          id="dakatool-access-code"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit()
          }}
          autoComplete="current-password"
          className="field-input min-h-11 pl-10"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "dakatool-access-error" : undefined}
          autoFocus
        />
      </div>
      {error && <p id="dakatool-access-error" role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={() => void submit()} disabled={busy || code.trim().length < 4} className="btn-primary mt-4 min-h-11 w-full justify-center">
        {busy ? "Đang kiểm tra..." : "Mở DakaTool"}
      </button>
    </div>
  )
}
