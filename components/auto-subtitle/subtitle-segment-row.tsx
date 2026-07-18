"use client"

import { useEffect, useState } from "react"
import { msToClock, clockToMs } from "@/lib/auto-subtitle/time"
import type { SegmentDTO } from "@/lib/auto-subtitle/types"

export function SubtitleSegmentRow({
  segment,
  active,
  onChange,
  onSeek,
}: {
  segment: SegmentDTO
  active: boolean
  onChange: (patch: { startMs?: number; endMs?: number; text?: string }) => void
  onSeek: (ms: number) => void
}) {
  const [text, setText] = useState(segment.text)
  const [start, setStart] = useState(msToClock(segment.startMs))
  const [end, setEnd] = useState(msToClock(segment.endMs))

  // Đồng bộ khi segment đổi từ ngoài (ví dụ reload).
  useEffect(() => setText(segment.text), [segment.text])
  useEffect(() => setStart(msToClock(segment.startMs)), [segment.startMs])
  useEffect(() => setEnd(msToClock(segment.endMs)), [segment.endMs])

  function commitStart() {
    const ms = clockToMs(start)
    if (ms !== null && ms !== segment.startMs && ms < segment.endMs) onChange({ startMs: ms })
    else setStart(msToClock(segment.startMs))
  }
  function commitEnd() {
    const ms = clockToMs(end)
    if (ms !== null && ms !== segment.endMs && ms > segment.startMs) onChange({ endMs: ms })
    else setEnd(msToClock(segment.endMs))
  }

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        active
          ? "border-primary bg-[color:var(--primary-soft)]"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="font-mono text-gray-400">#{segment.order}</span>
        <input
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={commitStart}
          className="w-28 rounded-md border border-gray-200 bg-transparent px-1.5 py-0.5 font-mono text-gray-600 focus:border-primary focus:outline-none dark:border-gray-700 dark:text-gray-300"
        />
        <span className="text-gray-400">→</span>
        <input
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={commitEnd}
          className="w-28 rounded-md border border-gray-200 bg-transparent px-1.5 py-0.5 font-mono text-gray-600 focus:border-primary focus:outline-none dark:border-gray-700 dark:text-gray-300"
        />
        <button
          type="button"
          onClick={() => onSeek(segment.startMs)}
          className="ml-auto rounded-md px-2 py-0.5 text-primary hover:bg-[color:var(--primary-soft)]"
        >
          ▶ Tới đoạn
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== segment.text && onChange({ text })}
        rows={2}
        className="w-full resize-none rounded-md border border-gray-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-gray-700"
      />
    </div>
  )
}
