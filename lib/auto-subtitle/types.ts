/**
 * Kiểu dữ liệu dùng chung cho Auto Subtitle (UI, API, worker).
 * DTO tách khỏi kiểu Prisma để: (1) đổi BigInt → number cho JSON, (2) không lộ field nội bộ.
 */
import type { DEFAULT_SUBTITLE_STYLE } from "./constants"

export type SubtitleStyle = typeof DEFAULT_SUBTITLE_STYLE

export interface WordTiming {
  startMs: number | null
  endMs: number | null
  text: string
}

export interface SegmentDTO {
  id: string
  order: number
  startMs: number
  endMs: number
  text: string
  speaker: string | null
  words: WordTiming[] | null
}

export interface JobDTO {
  id: string
  type: "TRANSCRIBE" | "RENDER_VIDEO" | "GENERATE_EXPORT"
  status: "QUEUED" | "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED"
  progress: number
  attempts: number
  errorCode: string | null
  errorMessage: string | null
}

export interface ExportDTO {
  id: string
  type: "SRT" | "VTT" | "ASS" | "BURNED_MP4"
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  filename: string
  mimeType: string
  sizeBytes: number | null
  errorMessage: string | null
}

export type ProjectStatusDTO =
  | "UPLOADING"
  | "UPLOADED"
  | "QUEUED"
  | "EXTRACTING_AUDIO"
  | "TRANSCRIBING"
  | "FORMATTING"
  | "READY"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED"

export interface ProjectDTO {
  id: string
  title: string
  sourceFilename: string
  sourceMimeType: string
  sourceSizeBytes: number
  durationMs: number | null
  detectedLanguage: string | null
  requestedLanguage: string
  status: ProjectStatusDTO
  progress: number
  errorCode: string | null
  errorMessage: string | null
  subtitleStyle: SubtitleStyle
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface ProjectDetailDTO extends ProjectDTO {
  segments: SegmentDTO[]
  jobs: JobDTO[]
  exports: ExportDTO[]
}

/** Sự kiện tiến độ đọc từ stdout Python engine (JSON Lines). */
export type EngineProgressEvent =
  | { type: "progress"; stage: string; progress: number }
  | { type: "completed"; resultPath: string }
  | { type: "error"; code?: string; message: string }

/** result.json do Python engine ghi ra. */
export interface EngineResult {
  language: string
  languageProbability: number
  durationMs: number
  segments: Array<{
    order: number
    startMs: number
    endMs: number
    text: string
    words?: WordTiming[]
  }>
}
