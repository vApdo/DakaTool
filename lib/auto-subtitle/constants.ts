/**
 * Hằng số & cấu hình (đọc từ env) cho Auto Subtitle. Dùng chung cho API và worker.
 * Không chứa secret.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Giới hạn upload — cấu hình được qua env. */
export const MAX_VIDEO_SIZE_BYTES = intEnv("MAX_VIDEO_SIZE_BYTES", 1_073_741_824) // 1 GB
export const MAX_VIDEO_DURATION_SECONDS = intEnv("MAX_VIDEO_DURATION_SECONDS", 7200) // 2 giờ

/** Định dạng video chấp nhận. */
export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
] as const
export const ALLOWED_VIDEO_EXT = [".mp4", ".mov", ".webm", ".mkv"] as const

/** Ngôn ngữ hỗ trợ chọn ở UI (auto = tự nhận diện). */
export const SUPPORTED_LANGUAGES = ["auto", "vi", "en", "ja"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

/** Giới hạn độ dài text một segment (chống lạm dụng / dữ liệu hỏng). */
export const MAX_SEGMENT_TEXT_LENGTH = 2000

/** Tên queue BullMQ. */
export const SUBTITLE_QUEUE_NAME = "dakatool-auto-subtitle"

export const JOB_NAMES = {
  transcribe: "transcribe-video",
  render: "render-video",
  export: "generate-subtitle-export",
} as const

/** Style phụ đề mặc định (lưu ở SubtitleProject.subtitleStyle, dùng khi render ASS). */
export const DEFAULT_SUBTITLE_STYLE = {
  fontName: "DejaVu Sans",
  fontSize: 56,
  primaryColor: "#FFFFFF",
  outlineColor: "#000000",
  outlineWidth: 4,
  position: "bottom" as "bottom" | "middle" | "top",
  marginV: 80,
  backgroundEnabled: false,
  backgroundColor: "#000000",
  backgroundOpacity: 0.5,
}

/** Mã lỗi tối thiểu — lưu ở project.errorCode / job.errorCode. */
export const ERROR_CODES = {
  INVALID_FILE: "INVALID_FILE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  VIDEO_TOO_LONG: "VIDEO_TOO_LONG",
  FFPROBE_FAILED: "FFPROBE_FAILED",
  AUDIO_EXTRACTION_FAILED: "AUDIO_EXTRACTION_FAILED",
  TRANSCRIPTION_FAILED: "TRANSCRIPTION_FAILED",
  MODEL_LOAD_FAILED: "MODEL_LOAD_FAILED",
  RENDER_FAILED: "RENDER_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  JOB_TIMEOUT: "JOB_TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const
export type ErrorCode = keyof typeof ERROR_CODES

/** Cắt bớt error message trước khi lưu DB (không lưu stack dài). */
export const MAX_ERROR_MESSAGE_LENGTH = 1000
export function truncateError(message: string): string {
  return message.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
    : message
}

export const JOB_TIMEOUT_MS = intEnv("JOB_TIMEOUT_MS", 60 * 60 * 1000) // 1 giờ
export const WORKER_CONCURRENCY = intEnv("WORKER_CONCURRENCY", 1)

/**
 * Thời gian giữ khóa job (ms). Job transcribe/render chạy nhiều phút; đặt rộng để
 * không bị BullMQ coi là "treo". Worker vẫn tự gia hạn khóa định kỳ khi còn sống.
 */
export const WORKER_LOCK_DURATION_MS = intEnv("WORKER_LOCK_DURATION_MS", 30 * 60 * 1000) // 30 phút
