/**
 * Phân loại lỗi để quyết định có nên để BullMQ retry hay không.
 *
 * - Lỗi TẠM THỜI (spawn hỏng, timeout, storage/DB chập chờn, lỗi không rõ): nên retry
 *   — ném lại để BullMQ chạy lại theo attempts + backoff.
 * - Lỗi CỐ ĐỊNH (file sai định dạng, quá lớn/dài, ffprobe fail, model không tải được):
 *   retry vô ích — đánh dấu FAILED ngay, không ném.
 */
import type { Job } from "bullmq"

/** Mã lỗi cố định — retry cũng không khỏi. */
const TERMINAL_CODES = new Set<string>([
  "INVALID_FILE",
  "FILE_TOO_LARGE",
  "VIDEO_TOO_LONG",
  "FFPROBE_FAILED",
  "MODEL_LOAD_FAILED",
])

export function isRetryable(errorCode: string): boolean {
  return !TERMINAL_CODES.has(errorCode)
}

/** Đây có phải lần thử cuối cùng không (dựa trên cấu hình attempts của job). */
export function isFinalAttempt(job: Pick<Job, "attemptsMade" | "opts">): boolean {
  const maxAttempts = job.opts?.attempts ?? 1
  // attemptsMade là số lần đã chạy TRƯỚC lần hiện tại; +1 = lần hiện tại.
  return job.attemptsMade + 1 >= maxAttempts
}
