"use client"

import { useCallback, useRef, useState } from "react"
import type { Tool } from "@/lib/types"
import { recordRun } from "@/lib/run-history"
import type { SimpleRunState } from "./run-status"

/**
 * useState cho SimpleRunState kèm ghi lịch sử chạy thật:
 * bấm giờ từ lúc chuyển sang "working", và khi kết thúc ("done"/"error")
 * thì lưu một bản ghi vào lịch sử với thông báo kết quả làm tóm tắt.
 */
export function useToolRunState(tool: Tool): [SimpleRunState, (next: SimpleRunState) => void] {
  const [state, setStateRaw] = useState<SimpleRunState>({ step: "idle" })
  const startedAt = useRef<number | null>(null)

  const setState = useCallback(
    (next: SimpleRunState) => {
      if (next.step === "working" && startedAt.current === null) {
        startedAt.current = Date.now()
      }
      if (next.step === "done" || next.step === "error") {
        const duration =
          startedAt.current !== null ? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)) : null
        startedAt.current = null
        recordRun({
          toolId: tool.id,
          toolName: tool.name,
          status: next.step === "done" ? "success" : "failed",
          durationSeconds: duration,
          summary: next.message,
        })
      }
      if (next.step === "idle") startedAt.current = null
      setStateRaw(next)
    },
    [tool.id, tool.name],
  )

  return [state, setState]
}
