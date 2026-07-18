/**
 * Chạy FFmpeg render (ghép sub vào video) với mảng tham số, KHÔNG shell.
 * Đọc tiến độ qua `-progress pipe:1 -nostats`, parse out_time_ms.
 */
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"

export interface RenderOptions {
  ffmpegBin: string
  inputVideo: string
  assPath: string
  fontsDir: string
  outputPath: string
  durationMs: number
  onProgress?: (fraction: number) => void
}

export interface RenderResult {
  exitCode: number | null
  stderrTail: string
}

/** Escape đường dẫn cho filter ass= của FFmpeg (dấu ':' và '\\' có ý nghĩa đặc biệt). */
function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'")
}

export function renderBurnedVideo(opts: RenderOptions): Promise<RenderResult> {
  const assArg = `ass=${escapeFilterPath(opts.assPath)}:fontsdir=${escapeFilterPath(opts.fontsDir)}`
  const args = [
    "-nostdin",
    "-y",
    "-i",
    opts.inputVideo,
    "-vf",
    assArg,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-progress",
    "pipe:1",
    "-nostats",
    opts.outputPath,
  ]

  return new Promise<RenderResult>((resolve, reject) => {
    const child = spawn(opts.ffmpegBin, args, { shell: false })
    const stderrChunks: string[] = []
    const totalMs = Math.max(1, opts.durationMs)

    const rl = createInterface({ input: child.stdout })
    rl.on("line", (line) => {
      // FFmpeg -progress ghi các cặp key=value; out_time_ms là micro giây (tên gây nhầm).
      const m = line.match(/^out_time_ms=(\d+)/)
      if (m && opts.onProgress) {
        const outMs = Number(m[1]) / 1000
        opts.onProgress(Math.max(0, Math.min(1, outMs / totalMs)))
      }
    })

    child.stderr.on("data", (buf: Buffer) => {
      stderrChunks.push(buf.toString())
      if (stderrChunks.length > 200) stderrChunks.shift()
    })

    child.on("error", reject)
    child.on("close", (code) => {
      resolve({ exitCode: code, stderrTail: stderrChunks.join("").slice(-2000) })
    })
  })
}
