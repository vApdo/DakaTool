"use client"

import { useSyncExternalStore } from "react"
import type { RunRecord, RunStatus } from "./types"

/**
 * Lịch sử chạy tool THẬT, lưu trong localStorage của trình duyệt.
 * DakaTool xử lý mọi thứ client-side nên lịch sử cũng nằm trên máy người dùng —
 * không có server, không gửi dữ liệu đi đâu.
 */

const STORAGE_KEY = "dakatool.run-history.v1"
const MAX_RECORDS = 200
const CHANGE_EVENT = "dakatool:run-history-changed"

function readAll(): RunRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RunRecord[]) : []
  } catch {
    return []
  }
}

function writeAll(records: RunRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ riêng tư) — bỏ qua, không làm hỏng tool.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export interface RunInput {
  toolId: string
  toolName: string
  status: Exclude<RunStatus, "running">
  durationSeconds: number | null
  summary: string
}

/** Ghi một lần chạy vào lịch sử (mới nhất đứng đầu, giữ tối đa MAX_RECORDS bản ghi). */
export function recordRun(input: RunInput) {
  const record: RunRecord = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    toolId: input.toolId,
    toolName: input.toolName,
    status: input.status,
    startedAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    summary: input.summary,
    runBy: "Bạn (trình duyệt này)",
  }
  writeAll([record, ...readAll()].slice(0, MAX_RECORDS))
}

/**
 * Ghi một lần chạy đã kết thúc, tự tính thời lượng từ mốc bắt đầu (Date.now() lúc start).
 * Dùng chung cho mọi runner để công thức làm tròn thời lượng chỉ tồn tại một chỗ.
 */
export function recordFinishedRun(input: Omit<RunInput, "durationSeconds"> & { startedAtMs: number | null }) {
  const { startedAtMs, ...rest } = input
  recordRun({
    ...rest,
    durationSeconds: startedAtMs !== null ? Math.max(1, Math.round((Date.now() - startedAtMs) / 1000)) : null,
  })
}

/** Xóa toàn bộ lịch sử chạy trên trình duyệt này. */
export function clearRunHistory() {
  writeAll([])
}

// Cache snapshot để useSyncExternalStore không tạo mảng mới mỗi lần render.
let cache: RunRecord[] = []
let cacheDirty = true

function subscribe(onChange: () => void) {
  const invalidate = () => {
    cacheDirty = true
    onChange()
  }
  window.addEventListener(CHANGE_EVENT, invalidate)
  // Đồng bộ khi tab khác ghi lịch sử.
  window.addEventListener("storage", invalidate)
  return () => {
    window.removeEventListener(CHANGE_EVENT, invalidate)
    window.removeEventListener("storage", invalidate)
  }
}

function getSnapshot(): RunRecord[] {
  if (cacheDirty) {
    cache = readAll()
    cacheDirty = false
  }
  return cache
}

const EMPTY: RunRecord[] = []

/** Hook đọc lịch sử chạy, tự cập nhật khi có lần chạy mới (kể cả từ tab khác). */
export function useRunHistory(): RunRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
}
