"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { bulkUpdateSegments, updateStyle } from "@/lib/auto-subtitle/client"
import type { ProjectDetailDTO, SegmentDTO, SubtitleStyle } from "@/lib/auto-subtitle/types"
import { ExportPanel } from "./export-panel"
import { SubtitlePreview } from "./subtitle-preview"
import { SubtitleSegmentRow } from "./subtitle-segment-row"
import { SubtitleStylePanel } from "./subtitle-style-panel"

const SAVE_DEBOUNCE_MS = 800

export function SubtitleEditor({ project }: { project: ProjectDetailDTO }) {
  const [segments, setSegments] = useState<SegmentDTO[]>(project.segments)
  const [style, setStyle] = useState<SubtitleStyle>(project.subtitleStyle)
  const [currentMs, setCurrentMs] = useState(0)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const videoRef = useRef<HTMLVideoElement>(null)

  const dirtySegments = useRef<Map<string, SegmentDTO>>(new Map())
  const styleDirty = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeSegment = useMemo(
    () => segments.find((s) => currentMs >= s.startMs && currentMs < s.endMs) ?? null,
    [segments, currentMs],
  )

  const flush = useCallback(async () => {
    const pending = Array.from(dirtySegments.current.values())
    const styleToSave = styleDirty.current ? style : null
    if (pending.length === 0 && !styleToSave) return
    dirtySegments.current.clear()
    styleDirty.current = false
    setSaveState("saving")
    try {
      if (pending.length > 0) {
        await bulkUpdateSegments(
          project.id,
          pending.map((s) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, text: s.text })),
        )
      }
      if (styleToSave) await updateStyle(project.id, styleToSave)
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
    } catch {
      setSaveState("idle")
    }
  }, [project.id, style])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
  }, [flush])

  // Lưu nốt khi rời trang.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  function patchSegment(id: string, patch: Partial<SegmentDTO>) {
    setSegments((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      const updated = next.find((s) => s.id === id)
      if (updated) dirtySegments.current.set(id, updated)
      return next
    })
    scheduleSave()
  }

  function patchStyle(patch: Partial<SubtitleStyle>) {
    setStyle((prev) => ({ ...prev, ...patch }))
    styleDirty.current = true
    scheduleSave()
  }

  function seek(ms: number) {
    if (videoRef.current) videoRef.current.currentTime = ms / 1000
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Cột trái: preview + danh sách segment */}
      <div className="space-y-4">
        <SubtitlePreview
          ref={videoRef}
          videoUrl={`/api/tools/auto-subtitle/projects/${project.id}/source`}
          style={style}
          activeSegment={activeSegment}
          onTimeUpdate={setCurrentMs}
        />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Phụ đề ({segments.length} câu)
          </h3>
          <SaveIndicator state={saveState} />
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {segments.map((seg) => (
            <SubtitleSegmentRow
              key={seg.id}
              segment={seg}
              active={activeSegment?.id === seg.id}
              onChange={(patch) => patchSegment(seg.id, patch)}
              onSeek={seek}
            />
          ))}
        </div>
      </div>

      {/* Cột phải: style + export */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Kiểu phụ đề</h3>
          <SubtitleStylePanel style={style} onChange={patchStyle} />
        </section>
        <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Xuất kết quả</h3>
          <p className="mb-3 text-xs text-gray-400">
            Bản xuất dùng nội dung &amp; kiểu hiện tại. Lưu ý bấm ra ngoài ô để lưu trước khi xuất.
          </p>
          <ExportPanel projectId={project.id} style={style} initialExports={project.exports} />
        </section>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Đang lưu…
      </span>
    )
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3 w-3" /> Đã lưu
      </span>
    )
  return <span className="text-xs text-transparent">.</span>
}
