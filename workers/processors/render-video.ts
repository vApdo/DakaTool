/**
 * Processor: render-video (ghép/burn phụ đề vào video → MP4).
 *
 *  1. Sinh ASS từ segment hiện tại + style project (Python engine).
 *  2. Đưa video nguồn về path cục bộ.
 *  3. FFmpeg burn ASS (spawn, mảng args, không shell) với -progress pipe:1.
 *  4. Upload MP4 kết quả, đánh dấu export xong.
 */
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Job } from "bullmq"
import { ERROR_CODES, JOB_TIMEOUT_MS } from "@/lib/auto-subtitle/constants"
import * as repo from "@/lib/auto-subtitle/repository"
import type { RenderJobData } from "@/lib/queue/subtitle-queue"
import { buildStorageKey, getStorage } from "@/lib/storage"
import { renderBurnedVideo } from "../utils/ffmpeg-progress"
import { runBuild } from "../utils/python-process"
import { resolveToLocalPath } from "../utils/resolve-source"
import { createTempDir } from "../utils/temp-directory"

export async function processRenderVideo(job: Job<RenderJobData>): Promise<void> {
  const { jobId, projectId, exportId } = job.data
  const storage = getStorage()

  await repo.updateJob(jobId, { status: "ACTIVE", startedAt: new Date() })
  await repo.setExportProcessing(exportId)

  const project = await repo.getProjectRaw(projectId)
  if (!project) {
    await repo.updateJob(jobId, {
      status: "FAILED",
      errorMessage: "Project không tồn tại.",
      completedAt: new Date(),
    })
    await repo.failExport(exportId, "Project không tồn tại.")
    return
  }

  const temp = await createTempDir()
  try {
    await repo.updateProjectProgress(projectId, { status: "RENDERING", progress: 0 })

    // 1. Sinh ASS từ segment + style.
    const segments = await repo.getSegmentsForBuild(projectId)
    const segmentsPath = path.join(temp.path, "segments.json")
    const stylePath = path.join(temp.path, "style.json")
    await writeFile(segmentsPath, JSON.stringify(segments), "utf-8")
    await writeFile(stylePath, JSON.stringify(project.subtitleStyle), "utf-8")

    const subtitleDir = path.join(temp.path, "subs")
    const buildResult = await runBuild({
      pythonBin: process.env.SUBTITLE_ENGINE_PYTHON ?? "python3",
      engineDir: process.env.SUBTITLE_ENGINE_DIR ?? "./services/subtitle-engine",
      segmentsJsonPath: segmentsPath,
      styleJsonPath: stylePath,
      outputDir: subtitleDir,
      timeoutMs: JOB_TIMEOUT_MS,
    })
    if (buildResult.exitCode !== 0) {
      throw new Error(buildResult.errorEvent?.message ?? "Không sinh được ASS")
    }
    const assPath = path.join(subtitleDir, "subtitles.ass")

    // 2. Video nguồn về local.
    const sourcePath = await resolveToLocalPath(
      storage,
      project.sourceStorageKey,
      temp.path,
      `source${path.extname(project.sourceFilename) || ".mp4"}`,
    )

    // 3. FFmpeg burn.
    const outputPath = path.join(temp.path, "output.mp4")
    const fontsDir = process.env.SUBTITLE_FONTS_DIR ?? "./assets/fonts"
    const render = await renderBurnedVideo({
      ffmpegBin: process.env.FFMPEG_BIN ?? "ffmpeg",
      inputVideo: sourcePath,
      assPath,
      fontsDir,
      outputPath,
      durationMs: project.durationMs ?? 0,
      onProgress: (fraction) => {
        const progress = Math.round(fraction * 100)
        void repo
          .updateProjectProgress(projectId, { status: "RENDERING", progress })
          .catch(() => undefined)
        void job.updateProgress(progress).catch(() => undefined)
      },
    })
    if (render.exitCode !== 0) {
      throw new Error(`FFmpeg render lỗi: ${render.stderrTail}`)
    }

    // 4. Upload MP4.
    const content = await readFile(outputPath)
    const size = (await stat(outputPath)).size
    const key = buildStorageKey({
      projectId,
      kind: "export",
      basename: `${project.title || "video"}-sub.mp4`,
    })
    await storage.putObject({
      key,
      body: content,
      contentType: "video/mp4",
      contentLength: size,
    })

    await repo.completeExport(exportId, { storageKey: key, sizeBytes: size })
    await repo.updateProjectProgress(projectId, { status: "COMPLETED", progress: 100 })
    await repo.updateJob(jobId, { status: "COMPLETED", progress: 100, completedAt: new Date() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const code =
      message === "JOB_TIMEOUT" ? ERROR_CODES.JOB_TIMEOUT : ERROR_CODES.RENDER_FAILED
    await repo.failExport(exportId, message)
    await repo.updateJob(jobId, {
      status: "FAILED",
      errorCode: code,
      errorMessage: message,
      completedAt: new Date(),
    })
    await repo.updateProjectProgress(projectId, { status: "READY" })
  } finally {
    await temp.cleanup()
  }
}
