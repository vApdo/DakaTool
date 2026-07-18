/**
 * Chuyển đổi row Prisma → DTO cho API/UI.
 * Trọng tâm: BigInt → number (JSON không serialize được BigInt), Date → ISO string,
 * và ép Json về kiểu đã khai báo.
 */
import type {
  SubtitleExport,
  SubtitleJob,
  SubtitleProject,
  SubtitleSegment,
} from "@prisma/client"
import { DEFAULT_SUBTITLE_STYLE } from "./constants"
import type {
  ExportDTO,
  JobDTO,
  ProjectDTO,
  ProjectDetailDTO,
  SegmentDTO,
  SubtitleStyle,
  WordTiming,
} from "./types"

/** BigInt an toàn → number (giới hạn video ≤ 1GB nên không vượt Number.MAX_SAFE_INTEGER). */
function bigToNum(v: bigint | null): number | null {
  return v === null ? null : Number(v)
}

export function toSubtitleStyle(json: unknown): SubtitleStyle {
  if (json && typeof json === "object") {
    return { ...DEFAULT_SUBTITLE_STYLE, ...(json as Partial<SubtitleStyle>) }
  }
  return { ...DEFAULT_SUBTITLE_STYLE }
}

function toWords(json: unknown): WordTiming[] | null {
  return Array.isArray(json) ? (json as WordTiming[]) : null
}

export function toSegmentDTO(s: SubtitleSegment): SegmentDTO {
  return {
    id: s.id,
    order: s.order,
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text,
    speaker: s.speaker,
    words: toWords(s.words),
  }
}

export function toJobDTO(j: SubtitleJob): JobDTO {
  return {
    id: j.id,
    type: j.type,
    status: j.status,
    progress: j.progress,
    attempts: j.attempts,
    errorCode: j.errorCode,
    errorMessage: j.errorMessage,
  }
}

export function toExportDTO(e: SubtitleExport): ExportDTO {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    filename: e.filename,
    mimeType: e.mimeType,
    sizeBytes: bigToNum(e.sizeBytes),
    errorMessage: e.errorMessage,
  }
}

export function toProjectDTO(p: SubtitleProject): ProjectDTO {
  return {
    id: p.id,
    title: p.title,
    sourceFilename: p.sourceFilename,
    sourceMimeType: p.sourceMimeType,
    sourceSizeBytes: Number(p.sourceSizeBytes),
    durationMs: p.durationMs,
    detectedLanguage: p.detectedLanguage,
    requestedLanguage: p.requestedLanguage,
    status: p.status,
    progress: p.progress,
    errorCode: p.errorCode,
    errorMessage: p.errorMessage,
    subtitleStyle: toSubtitleStyle(p.subtitleStyle),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
  }
}

export function toProjectDetailDTO(
  p: SubtitleProject & {
    segments: SubtitleSegment[]
    jobs: SubtitleJob[]
    exports: SubtitleExport[]
  },
): ProjectDetailDTO {
  return {
    ...toProjectDTO(p),
    segments: p.segments.map(toSegmentDTO),
    jobs: p.jobs.map(toJobDTO),
    exports: p.exports.map(toExportDTO),
  }
}
