"use client"

import { useState } from "react"
import { Download, FileText, Film, Loader2 } from "lucide-react"
import { createExport, downloadUrl, getProject } from "@/lib/auto-subtitle/client"
import type { ExportDTO, SubtitleStyle } from "@/lib/auto-subtitle/types"

type ExportType = "SRT" | "VTT" | "ASS" | "BURNED_MP4"

export function ExportPanel({
  projectId,
  style,
  initialExports,
}: {
  projectId: string
  style: SubtitleStyle
  initialExports: ExportDTO[]
}) {
  const [exports, setExports] = useState<ExportDTO[]>(initialExports)
  const [pending, setPending] = useState<ExportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function poll(exportId: string) {
    for (let i = 0; i < 300; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const project = await getProject(projectId)
      const found = project.exports.find((e) => e.id === exportId)
      if (found && (found.status === "COMPLETED" || found.status === "FAILED")) {
        setExports(project.exports)
        return found
      }
      setExports(project.exports)
    }
    return null
  }

  async function handleExport(type: ExportType) {
    setError(null)
    setPending(type)
    try {
      const exportId = await createExport(projectId, type, type === "BURNED_MP4" ? style : undefined)
      const result = await poll(exportId)
      if (result?.status === "FAILED") setError(result.errorMessage ?? "Xuất thất bại.")
      else if (result?.status === "COMPLETED") window.location.href = downloadUrl(exportId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất thất bại.")
    } finally {
      setPending(null)
    }
  }

  const buttons: Array<{ type: ExportType; label: string; icon: typeof FileText }> = [
    { type: "SRT", label: "Tải .SRT", icon: FileText },
    { type: "VTT", label: "Tải .VTT", icon: FileText },
    { type: "ASS", label: "Tải .ASS", icon: FileText },
    { type: "BURNED_MP4", label: "Ghép cứng vào video (.MP4)", icon: Film },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {buttons.slice(0, 3).map((b) => (
          <ExportButton key={b.type} {...b} pending={pending} onClick={handleExport} />
        ))}
      </div>
      <ExportButton {...buttons[3]} pending={pending} onClick={handleExport} full />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {exports.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-medium text-gray-500">Bản xuất gần đây</p>
          {exports.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-800"
            >
              <span className="font-mono text-xs text-gray-400">{e.type}</span>
              <span className="truncate">{e.filename}</span>
              <span
                className={`ml-auto text-xs ${
                  e.status === "COMPLETED"
                    ? "text-green-600"
                    : e.status === "FAILED"
                      ? "text-red-500"
                      : "text-gray-400"
                }`}
              >
                {e.status}
              </span>
              {e.status === "COMPLETED" && (
                <a href={downloadUrl(e.id)} className="text-primary hover:underline">
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExportButton({
  type,
  label,
  icon: Icon,
  pending,
  onClick,
  full,
}: {
  type: ExportType
  label: string
  icon: typeof FileText
  pending: ExportType | null
  onClick: (t: ExportType) => void
  full?: boolean
}) {
  const busy = pending === type
  return (
    <button
      type="button"
      onClick={() => onClick(type)}
      disabled={pending !== null}
      className={`btn-secondary justify-center disabled:opacity-50 ${full ? "w-full" : ""}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}
