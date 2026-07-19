"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { ProcessingProgress } from "@/components/auto-subtitle/processing-progress"
import { SubtitleEditor } from "@/components/auto-subtitle/subtitle-editor"
import { getProject } from "@/lib/auto-subtitle/client"
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function tick() {
      try {
        const data = await getProject(projectId)
        if (cancelled) return
        setProject(data)
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
          <h1 className="mb-1 text-xl font-semibold text-black dark:text-white md:text-2xl">
            {project.title}
          </h1>
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
