/** Tiện ích thời gian dùng chung UI (ms ↔ chuỗi HH:MM:SS.mmm). Không phụ thuộc server. */

export function msToClock(ms: number): string {
  const safe = Math.max(0, Math.round(ms))
  const h = Math.floor(safe / 3_600_000)
  const m = Math.floor((safe % 3_600_000) / 60_000)
  const s = Math.floor((safe % 60_000) / 1000)
  const milli = safe % 1000
  const pad = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(milli, 3)}`
}

/** Parse "HH:MM:SS.mmm" hoặc "MM:SS.mmm" hoặc số giây → ms. Trả null nếu không hợp lệ. */
export function clockToMs(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/)
  if (!m) {
    const asNumber = Number(trimmed)
    return Number.isFinite(asNumber) ? Math.round(asNumber * 1000) : null
  }
  const h = m[1] ? Number(m[1]) : 0
  const min = Number(m[2])
  const sec = Number(m[3])
  const milli = m[4] ? Number(m[4].padEnd(3, "0")) : 0
  if (min > 59 || sec > 59) return null
  return ((h * 60 + min) * 60 + sec) * 1000 + milli
}
