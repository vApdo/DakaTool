/**
 * Gọi Python subtitle engine an toàn: spawn với MẢNG THAM SỐ, KHÔNG shell.
 *
 * TUYỆT ĐỐI không dùng exec(`python ${userInput}`) hay shell:true — tránh command
 * injection. Mọi tham số truyền qua mảng args cố định; giá trị động (đường dẫn) là
 * phần tử riêng, không nội suy vào chuỗi lệnh.
 *
 * Đọc stdout theo dòng → parse JSON Lines (sự kiện tiến độ). stderr = log chẩn đoán.
 */
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { EngineProgressEvent } from "@/lib/auto-subtitle/types"

export interface RunEngineOptions {
  pythonBin: string
  engineDir: string
  input: string
  outputDir: string
  language: string
  model: string
  device: string
  computeType: string
  beamSize: number
  vadEnabled: boolean
  timeoutMs: number
  onProgress?: (event: EngineProgressEvent) => void
}

export interface RunEngineResult {
  completedResultPath?: string
  errorEvent?: Extract<EngineProgressEvent, { type: "error" }>
  exitCode: number | null
  stderrTail: string
}

export interface RunBuildOptions {
  pythonBin: string
  engineDir: string
  segmentsJsonPath: string
  outputDir: string
  styleJsonPath?: string
  timeoutMs: number
}

/** Gọi subcommand `build` để sinh lại SRT/VTT/ASS từ segment đã chỉnh sửa. */
export function runBuild(opts: RunBuildOptions): Promise<RunEngineResult> {
  const args = [
    "-m",
    "subtitle_engine.cli",
    "build",
    "--segments",
    opts.segmentsJsonPath,
    "--output-dir",
    opts.outputDir,
  ]
  if (opts.styleJsonPath) args.push("--style", opts.styleJsonPath)
  return runSpawn(opts.pythonBin, args, opts.engineDir, opts.timeoutMs)
}

export function runEngine(opts: RunEngineOptions): Promise<RunEngineResult> {
  const args = [
    "-m",
    "subtitle_engine.cli",
    "transcribe",
    "--input",
    opts.input,
    "--output-dir",
    opts.outputDir,
    "--language",
    opts.language,
    "--model",
    opts.model,
    "--device",
    opts.device,
    "--compute-type",
    opts.computeType,
    "--beam-size",
    String(opts.beamSize),
  ]
  if (!opts.vadEnabled) args.push("--no-vad")
  return runSpawn(opts.pythonBin, args, opts.engineDir, opts.timeoutMs, opts.onProgress)
}

function runSpawn(
  pythonBin: string,
  args: string[],
  engineDir: string,
  timeoutMs: number,
  onProgress?: (event: EngineProgressEvent) => void,
): Promise<RunEngineResult> {
  return new Promise<RunEngineResult>((resolve, reject) => {
    // spawn: mảng args cố định, cwd = engineDir, KHÔNG shell.
    const child = spawn(pythonBin, args, {
      cwd: engineDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      shell: false,
    })

    let completedResultPath: string | undefined
    let errorEvent: RunEngineResult["errorEvent"]
    const stderrChunks: string[] = []
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill("SIGKILL")
      reject(new Error("JOB_TIMEOUT"))
    }, timeoutMs)

    const rl = createInterface({ input: child.stdout })
    rl.on("line", (line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      let event: EngineProgressEvent
      try {
        event = JSON.parse(trimmed) as EngineProgressEvent
      } catch {
        // Dòng không phải JSON → coi như log, bỏ qua.
        return
      }
      if (event.type === "completed") completedResultPath = event.resultPath
      else if (event.type === "error") errorEvent = event
      onProgress?.(event)
    })

    child.stderr.on("data", (buf: Buffer) => {
      stderrChunks.push(buf.toString())
      if (stderrChunks.length > 200) stderrChunks.shift()
    })

    child.on("error", (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })

    child.on("close", (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        completedResultPath,
        errorEvent,
        exitCode: code,
        stderrTail: stderrChunks.join("").slice(-2000),
      })
    })
  })
}
