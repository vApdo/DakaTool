import { describe, expect, it } from "vitest"
import { isFinalAttempt, isRetryable } from "@/lib/auto-subtitle/retry"

describe("isRetryable", () => {
  it("lỗi cố định không retry", () => {
    for (const code of ["INVALID_FILE", "FILE_TOO_LARGE", "VIDEO_TOO_LONG", "FFPROBE_FAILED", "MODEL_LOAD_FAILED"]) {
      expect(isRetryable(code)).toBe(false)
    }
  })
  it("lỗi tạm thời được retry", () => {
    for (const code of ["TRANSCRIPTION_FAILED", "RENDER_FAILED", "STORAGE_FAILED", "JOB_TIMEOUT", "UNKNOWN_ERROR"]) {
      expect(isRetryable(code)).toBe(true)
    }
  })
})

describe("isFinalAttempt", () => {
  it("attempts=2: lần 1 chưa phải cuối, lần 2 là cuối", () => {
    expect(isFinalAttempt({ attemptsMade: 0, opts: { attempts: 2 } })).toBe(false)
    expect(isFinalAttempt({ attemptsMade: 1, opts: { attempts: 2 } })).toBe(true)
  })
  it("không cấu hình attempts → mặc định 1 lần (luôn là cuối)", () => {
    expect(isFinalAttempt({ attemptsMade: 0, opts: {} })).toBe(true)
  })
})
