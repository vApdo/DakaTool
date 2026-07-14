"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Play, RotateCcw, Download, CheckCircle2 } from "lucide-react"
import type { Tool } from "@/lib/types"

type RunnerState = "idle" | "running" | "done"

interface LogLine {
  time: string
  text: string
}

function now(): string {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function ToolRunner({ tool }: { tool: Tool }) {
  const [state, setState] = useState<RunnerState>("idle")
  const [logs, setLogs] = useState<LogLine[]>([])
  const [progress, setProgress] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [logs])

  function handleRun(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === "running") return

    setState("running")
    setLogs([{ time: now(), text: `Bắt đầu chạy "${tool.name}"...` }])
    setProgress(5)

    const steps: { delay: number; text: string; progress: number }[] = [
      { delay: 600, text: "Kiểm tra thông tin đầu vào... hợp lệ.", progress: 20 },
      { delay: 1400, text: "Chuẩn bị môi trường chạy.", progress: 35 },
      { delay: 2400, text: "Đang xử lý dữ liệu (bước 1/2)...", progress: 60 },
      { delay: 3600, text: "Đang xử lý dữ liệu (bước 2/2)...", progress: 85 },
      { delay: 4600, text: "Ghi kết quả và dọn dẹp.", progress: 95 },
      { delay: 5200, text: "Hoàn tất. Kết quả sẵn sàng để export.", progress: 100 },
    ]

    steps.forEach((step, i) => {
      const t = setTimeout(() => {
        setLogs((prev) => [...prev, { time: now(), text: step.text }])
        setProgress(step.progress)
        if (i === steps.length - 1) setState("done")
      }, step.delay)
      timers.current.push(t)
    })
  }

  function handleReset() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setState("idle")
    setLogs([])
    setProgress(0)
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-semibold text-black dark:text-white">Chạy tool</h2>
      <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
        Tool này đang được triển khai. Bạn có thể chạy thử bên dưới — tiến trình chỉ là mô phỏng, chưa thực thi
        thật và không ghi vào lịch sử.
      </p>

      <form onSubmit={handleRun} className="space-y-4">
        {tool.inputs.map((input) => (
          <div key={input.name}>
            <label htmlFor={input.name} className="field-label">
              {input.label}
              {input.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {input.type === "textarea" ? (
              <textarea
                id={input.name}
                name={input.name}
                rows={3}
                placeholder={input.placeholder}
                required={input.required}
                className="field-input resize-y"
              />
            ) : input.type === "select" ? (
              <select id={input.name} name={input.name} className="field-input" defaultValue={input.options?.[0]}>
                {input.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : input.type === "file" ? (
              <input
                id={input.name}
                name={input.name}
                type="file"
                className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--primary-soft)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
              />
            ) : (
              <input
                id={input.name}
                name={input.name}
                type={input.type}
                placeholder={input.placeholder}
                required={input.required}
                className="field-input"
              />
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" className="btn-primary" disabled={state === "running"}>
            <Play className="h-4 w-4" />
            {state === "running" ? "Đang chạy..." : "Chạy tool"}
          </button>
          {state !== "idle" && (
            <button type="button" onClick={handleReset} className="btn-outline">
              <RotateCcw className="h-4 w-4" />
              Chạy lại từ đầu
            </button>
          )}
        </div>
      </form>

      {state !== "idle" && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Tiến trình</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[color:var(--primary-fill)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="mt-4 max-h-56 overflow-y-auto rounded-xl bg-gray-950 p-4 font-mono text-xs leading-relaxed text-gray-300"
            role="log"
            aria-live="polite"
          >
            {logs.map((line, i) => (
              <p key={i}>
                <span className="text-gray-500">[{line.time}]</span> {line.text}
              </p>
            ))}
            {state === "running" && <p className="animate-pulse text-primary">▍</p>}
            <div ref={logEndRef} />
          </div>

          {state === "done" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Chạy thử (mô phỏng) hoàn tất. Khi tool được triển khai thật, kết quả sẽ được ghi vào lịch sử.
              </p>
              <Link href="/export" className="btn-outline">
                <Download className="h-4 w-4" />
                Export kết quả
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
