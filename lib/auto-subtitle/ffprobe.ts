/**
 * Xác minh video bằng ffprobe (server-side). Gọi spawn với mảng tham số, KHÔNG shell.
 * Không tin đuôi file / MIME client khai báo — kiểm tra thực tế có luồng video và thời lượng.
 */
import { spawn } from "node:child_process"

export interface ProbeResult {
  durationMs: number
  hasVideo: boolean
}

export class ProbeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
  }
}

export function ffprobeFile(filePath: string): Promise<ProbeResult> {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type",
    "-of",
    "json",
    filePath,
  ]
  return new Promise<ProbeResult>((resolve, reject) => {
    const child = spawn(process.env.FFPROBE_BIN ?? "ffprobe", args, { shell: false })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString()))
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()))
    child.on("error", (err) => reject(new ProbeError(err.message, "FFPROBE_FAILED")))
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new ProbeError(`ffprobe lỗi: ${stderr.slice(-300)}`, "FFPROBE_FAILED"))
        return
      }
      try {
        const data = JSON.parse(stdout) as {
          format?: { duration?: string }
          streams?: Array<{ codec_type?: string }>
        }
        const duration = Number(data.format?.duration)
        const hasVideo = (data.streams ?? []).some((s) => s.codec_type === "video")
        if (!Number.isFinite(duration)) {
          reject(new ProbeError("Không đọc được thời lượng video.", "FFPROBE_FAILED"))
          return
        }
        resolve({ durationMs: Math.round(duration * 1000), hasVideo })
      } catch (err) {
        reject(new ProbeError(`ffprobe output không hợp lệ: ${err}`, "FFPROBE_FAILED"))
      }
    })
  })
}
