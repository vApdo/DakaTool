/**
 * Processor: transcribe-video.
 *
 * Trách nhiệm (theo spec worker Node):
 *  1. Lấy project + source video từ storage.
 *  2. Tạo thư mục tạm.
 *  3. Gọi Python engine (spawn, mảng args, không shell) — engine KHÔNG chạm DB.
 *  4. Đọc tiến độ JSON Lines → cập nhật DB.
 *  5. Đọc result.json → lưu segment vào DB, upload file phụ đề vào storage.
 *  6. Cập nhật trạng thái, dọn thư mục tạm.
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Job } from "bullmq"
import {
  ERROR_CODES,
  JOB_TIMEOUT_MS,
  truncateError,
} from "@/lib/auto-subtitle/constants"
import { isFinalAttempt, isRetryable } from "@/lib/auto-subtitle/retry"
import * as repo from "@/lib/auto-subtitle/repository"
import type { EngineResult } from "@/lib/auto-subtitle/types"
import { buildStorageKey, getStorage } from "@/lib/storage"
import type { TranscribeJobData } from "@/lib/queue/subtitle-queue"
import { runEngine } from "../utils/python-process"
import { resolveToLocalPath } from "../utils/resolve-source"
import { createTempDir } from "../utils/temp-directory"

/** Map stage engine → ProjectStatus. */
const STAGE_STATUS: Record<string, "EXTRACTING_AUDIO" | "TRANSCRIBING" | "FORMATTING"> = {
  extracting_audio: "EXTRACTING_AUDIO",
  transcribing: "TRANSCRIBING",
  formatting: "FORMATTING",
  writing: "FORMATTING",
}

const SUBTITLE_MIME: Record<string, string> = {
  srt: "application/x-subrip",
  vtt: "text/vtt",
  ass: "text/x-ssa",
}

export async function processTranscribe(job: Job<TranscribeJobData>): Promise<void> {
  const { jobId, projectId } = job.data
  const storage = getStorage()

  const project = await repo.getProjectRaw(projectId)
  if (!project) {
    await repo.updateJob(jobId, {
      status: "FAILED",
      errorCode: ERROR_CODES.UNKNOWN_ERROR,
      errorMessage: "Project không tồn tại.",
      completedAt: new Date(),
    })
    return
  }

  await repo.updateJob(jobId, { status: "ACTIVE", startedAt: new Date() })

  const temp = await createTempDir()
  try {
    const sourcePath = await resolveToLocalPath(
      storage,
      project.sourceStorageKey,
      temp.path,
      `source${path.extname(project.sourceFilename) || ".mp4"}`,
    )
    const outputDir = path.join(temp.path, "out")

    await repo.updateProjectProgress(projectId, { status: "EXTRACTING_AUDIO", progress: 2 })

    const result = await runEngine({
      pythonBin: process.env.SUBTITLE_ENGINE_PYTHON ?? "python3",
      engineDir: process.env.SUBTITLE_ENGINE_DIR ?? "./services/subtitle-engine",
      input: sourcePath,
      outputDir,
      language: project.requestedLanguage || "auto",
      model: process.env.WHISPER_MODEL ?? "small",
      device: process.env.WHISPER_DEVICE ?? "cpu",
      computeType: process.env.WHISPER_COMPUTE_TYPE ?? "int8",
      beamSize: Number(process.env.WHISPER_BEAM_SIZE ?? 5),
      vadEnabled: (process.env.WHISPER_VAD_ENABLED ?? "true") !== "false",
      timeoutMs: JOB_TIMEOUT_MS,
      onProgress: (event) => {
        if (event.type === "progress") {
          const status = STAGE_STATUS[event.stage]
          const progress = Math.round(event.progress * 100)
          void repo
            .updateProjectProgress(projectId, { status, progress })
            .catch(() => undefined)
          void job.updateProgress(progress).catch(() => undefined)
        }
      },
    })

    if (result.errorEvent) {
      const code = result.errorEvent.code ?? ERROR_CODES.TRANSCRIPTION_FAILED
      if (isRetryable(code) && !isFinalAttempt(job)) {
        await repo.updateJob(jobId, {
          status: "QUEUED",
          attempts: job.attemptsMade + 1,
          errorCode: code,
          errorMessage: truncateError(result.errorEvent.message),
        })
        await repo.updateProjectProgress(projectId, { status: "QUEUED" })
        throw new Error(result.errorEvent.message)
      }
      await repo.failJobAndProject(jobId, projectId, code, result.errorEvent.message)
      return
    }
    if (result.exitCode !== 0 || !result.completedResultPath) {
      const message = `Engine thoát mã ${result.exitCode}. ${result.stderrTail}`
      if (!isFinalAttempt(job)) {
        await repo.updateJob(jobId, {
          status: "QUEUED",
          attempts: job.attemptsMade + 1,
          errorCode: ERROR_CODES.TRANSCRIPTION_FAILED,
          errorMessage: truncateError(message),
        })
        await repo.updateProjectProgress(projectId, { status: "QUEUED" })
        throw new Error(message)
      }
      await repo.failJobAndProject(jobId, projectId, ERROR_CODES.TRANSCRIPTION_FAILED, message)
      return
    }

    await repo.updateProjectProgress(projectId, { status: "FORMATTING", progress: 96 })

    const engineResult = JSON.parse(
      await readFile(result.completedResultPath, "utf-8"),
    ) as EngineResult

    await repo.replaceSegments(
      projectId,
      engineResult.segments.map((s) => ({
        order: s.order,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
        words: s.words,
      })),
    )

    // Upload các file phụ đề vào storage để tải nhanh (SRT/VTT/ASS luôn có sẵn).
    for (const ext of ["srt", "vtt", "ass"] as const) {
      const localFile = path.join(outputDir, `subtitles.${ext}`)
      const content = await readFile(localFile)
      const key = buildStorageKey({ projectId, kind: "result", basename: `subtitles.${ext}` })
      await storage.putObject({
        key,
        body: content,
        contentType: SUBTITLE_MIME[ext],
        contentLength: content.length,
      })
    }

    await repo.updateProjectProgress(projectId, {
      status: "READY",
      progress: 100,
      durationMs: engineResult.durationMs,
      detectedLanguage: engineResult.language,
    })
    await repo.updateJob(jobId, {
      status: "COMPLETED",
      progress: 100,
      completedAt: new Date(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const code =
      message === "JOB_TIMEOUT" ? ERROR_CODES.JOB_TIMEOUT : ERROR_CODES.UNKNOWN_ERROR

    // Lỗi tạm thời & còn lượt thử → ném lại để BullMQ retry (attempts + backoff).
    if (isRetryable(code) && !isFinalAttempt(job)) {
      await repo.updateJob(jobId, {
        status: "QUEUED",
        attempts: job.attemptsMade + 1,
        errorCode: code,
        errorMessage: truncateError(message),
      })
      await repo.updateProjectProgress(projectId, { status: "QUEUED" })
      throw err
    }
    await repo.failJobAndProject(jobId, projectId, code, truncateError(message))
  } finally {
    await temp.cleanup()
  }
}
