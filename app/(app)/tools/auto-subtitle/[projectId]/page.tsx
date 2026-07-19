"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react"
import { ProcessingProgress } from "@/components/auto-subtitle/processing-progress"
import { SubtitleEditor } from "@/components/auto-subtitle/subtitle-editor"
import { getProject, startTranscription } from "@/lib/auto-subtitle/client"
import type { ProjectDetailDTO } from "@/lib/auto-subtitle/types"

const PROCESSING_STATUSES = new Set([
  "QUEUED",
  "EXTRACTING_AUDIO",
  "TRANSCRIBING",
  "FORMATTING",
  "RENDERING",
])

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params
  const [project, setProject] = useState<ProjectDetailDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restarting, setRestarting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sepVocals, setSepVocals] = useState(false)
  const sepInit = useRef(false)

  async function handleRetranscribe() {
    const sure = window.confirm(
      "Nhận dạng lại sẽ THAY TOÀN BỘ phụ đề hiện tại (kể cả phần bạn đã sửa) bằng kết quả mới. Tiếp tục?",
    )
    if (!sure) return
    setRestarting(true)
    try {
      await startTranscription(projectId, { separateVocals: sepVocals })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không bắt đầu lại được.")
      setRestarting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const data = await getProject(projectId)
        if (cancelled) return
        setProject(data)
        if (!sepInit.current) {
          setSepVocals(data.separateVocals)
          sepInit.current = true
        }
        setError(null)
        // Poll mỗi 2s khi còn đang xử lý.
        if (PROCESSING_STATUSES.has(data.status)) {
          timer.current = setTimeout(tick, 2000)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Không tải được project.")
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [projectId])

  return (
    <div>
      <Link href="/tools/auto-subtitle" className="btn-secondary mb-6 text-gray-600 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Tạo phụ đề mới
      </Link>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!project && !error && <ProcessingProgress status="QUEUED" progress={0} />}

      {project && (
        <>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-black dark:text-white md:text-2xl">
              {project.title}
            </h1>
            {(project.status === "READY" ||
              project.status === "COMPLETED" ||
              project.status === "FAILED") && (
              <span className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetranscribe}
                  disabled={restarting}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${restarting ? "animate-spin" : ""}`} />
                  Nhận dạng lại
                </button>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={sepVocals}
                    onChange={(e) => setSepVocals(e.target.checked)}
                  />
                  Tách giọng khỏi nhạc nền (chậm hơn)
                </label>
              </span>
            )}
          </div>
          <p className="mb-6 text-sm text-gray-500">
            {project.detectedLanguage
              ? `Ngôn ngữ: ${project.detectedLanguage.toUpperCase()}`
              : `Yêu cầu: ${project.requestedLanguage}`}
          </p>

          {project.status === "FAILED" && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              {project.errorMessage ?? "Xử lý thất bại."} ({project.errorCode})
            </div>
          )}

          {PROCESSING_STATUSES.has(project.status) && (
            <ProcessingProgress status={project.status} progress={project.progress} />
          )}

          {(project.status === "READY" || project.status === "COMPLETED") && (
            <SubtitleEditor project={project} />
          )}
        </>
      )}
    </div>
  )
}
