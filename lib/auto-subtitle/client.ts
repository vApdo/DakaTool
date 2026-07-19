/**
 * Client fetch helpers cho Auto Subtitle (dùng trong component React phía trình duyệt).
 * Mọi request đính kèm cookie (credentials: same-origin mặc định) để mang danh tính owner.
 */
import type {
  ProjectDetailDTO,
  ProjectDTO,
  SubtitleStyle,
} from "./types"

const BASE = "/api/tools/auto-subtitle"

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {
      /* bỏ qua */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function uploadVideo(
  file: File,
  opts: { language: string; title?: string; separateVocals?: boolean },
  onProgress?: (fraction: number) => void,
): Promise<ProjectDTO> {
  const form = new FormData()
  form.append("file", file)
  form.append("language", opts.language)
  if (opts.separateVocals) form.append("separateVocals", "true")
  if (opts.title) form.append("title", opts.title)

  // Dùng XHR để có tiến độ upload.
  return new Promise<ProjectDTO>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE}/projects`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as { project: ProjectDTO }).project)
        } catch (err) {
          reject(err)
        }
      } else {
        let message = `Lỗi ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText) as { error?: { message?: string } }
          if (body.error?.message) message = body.error.message
        } catch {
          /* bỏ qua */
        }
        reject(new Error(message))
      }
    }
    xhr.onerror = () => reject(new Error("Không kết nối được máy chủ."))
    xhr.send(form)
  })
}

export async function startTranscription(
  projectId: string,
  opts?: { separateVocals?: boolean },
): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts ?? {}),
    }),
  )
}

export async function getProject(projectId: string): Promise<ProjectDetailDTO> {
  const data = await jsonOrThrow<{ project: ProjectDetailDTO }>(
    await fetch(`${BASE}/projects/${projectId}`, { cache: "no-store" }),
  )
  return data.project
}

export async function updateSegment(
  projectId: string,
  segmentId: string,
  patch: { startMs?: number; endMs?: number; text?: string },
): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/segments/${segmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  )
}

export async function bulkUpdateSegments(
  projectId: string,
  segments: Array<{ id: string; startMs: number; endMs: number; text: string }>,
): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/segments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments }),
    }),
  )
}

export async function updateStyle(projectId: string, style: SubtitleStyle): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/style`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(style),
    }),
  )
}

export async function createExport(
  projectId: string,
  type: "SRT" | "VTT" | "ASS" | "BURNED_MP4",
  style?: SubtitleStyle,
): Promise<string> {
  const data = await jsonOrThrow<{ exportId: string }>(
    await fetch(`${BASE}/projects/${projectId}/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "BURNED_MP4" && style ? { type, style } : { type }),
    }),
  )
  return data.exportId
}

export function downloadUrl(exportId: string): string {
  return `${BASE}/exports/${exportId}/download`
}

export interface AiSettingsStatus {
  provider: "local" | "openai"
  openaiModel: "whisper-1" | "gpt-4o-transcribe"
  openaiKeyConfigured: boolean
  openaiKeyHint: string | null
}

export async function getSettings(): Promise<AiSettingsStatus> {
  return jsonOrThrow<AiSettingsStatus>(await fetch(`${BASE}/settings`, { cache: "no-store" }))
}

export async function updateSettings(input: {
  provider: "local" | "openai"
  openaiModel: "whisper-1" | "gpt-4o-transcribe"
  openaiApiKey?: string
}): Promise<AiSettingsStatus> {
  return jsonOrThrow<AiSettingsStatus>(
    await fetch(`${BASE}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  )
}
