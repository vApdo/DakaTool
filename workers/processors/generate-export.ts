/**
 * Processor: generate-subtitle-export (SRT / VTT / ASS).
 *
 * Sinh lại file phụ đề từ segment hiện tại trong DB (đã có thể chỉnh sửa) bằng
 * Python engine (spawn, mảng args), rồi upload vào storage và đánh dấu export xong.
 */
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Job } from "bullmq"
import { ERROR_CODES, JOB_TIMEOUT_MS } from "@/lib/auto-subtitle/constants"
import * as repo from "@/lib/auto-subtitle/repository"
import type { ExportJobData } from "@/lib/queue/subtitle-queue"
import { buildStorageKey, getStorage } from "@/lib/storage"
import { runBuild } from "../utils/python-process"
import { createTempDir } from "../utils/temp-directory"

const EXT_BY_TYPE: Record<string, "srt" | "vtt" | "ass"> = {
  SRT: "srt",
  VTT: "vtt",
  ASS: "ass",
}

export async function processGenerateExport(job: Job<ExportJobData>): Promise<void> {
  const { jobId, projectId, exportId } = job.data
  const storage = getStorage()

  await repo.updateJob(jobId, { status: "ACTIVE", startedAt: new Date() })
  await repo.setExportProcessing(exportId)

  const project = await repo.getProjectRaw(projectId)
  const exportType = await getExportType(exportId)
  if (!project || !exportType) {
    await repo.updateJob(jobId, {
      status: "FAILED",
      errorMessage: "Project/export không tồn tại.",
      completedAt: new Date(),
    })
    if (exportId) await repo.failExport(exportId, "Project/export không tồn tại.")
    return
  }

  const ext = EXT_BY_TYPE[exportType]
  const temp = await createTempDir()
  try {
    const segments = await repo.getSegmentsForBuild(projectId)
    const segmentsPath = path.join(temp.path, "segments.json")
    const stylePath = path.join(temp.path, "style.json")
    await writeFile(segmentsPath, JSON.stringify(segments), "utf-8")
    await writeFile(stylePath, JSON.stringify(project.subtitleStyle), "utf-8")

    const outputDir = path.join(temp.path, "out")
    const result = await runBuild({
      pythonBin: process.env.SUBTITLE_ENGINE_PYTHON ?? "python3",
      engineDir: process.env.SUBTITLE_ENGINE_DIR ?? "./services/subtitle-engine",
      segmentsJsonPath: segmentsPath,
      styleJsonPath: stylePath,
      outputDir,
      timeoutMs: JOB_TIMEOUT_MS,
    })
    if (result.exitCode !== 0) {
      throw new Error(result.errorEvent?.message ?? `Engine thoát mã ${result.exitCode}`)
    }

    const content = await readFile(path.join(outputDir, `subtitles.${ext}`))
    const key = buildStorageKey({
      projectId,
      kind: "export",
      basename: `${project.title || "subtitle"}.${ext}`,
    })
    await storage.putObject({
      key,
      body: content,
      contentType: mimeFor(ext),
      contentLength: content.length,
    })

    await repo.completeExport(exportId, { storageKey: key, sizeBytes: content.length })
    await repo.updateJob(jobId, { status: "COMPLETED", progress: 100, completedAt: new Date() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await repo.failExport(exportId, message)
    await repo.updateJob(jobId, {
      status: "FAILED",
      errorCode: ERROR_CODES.UNKNOWN_ERROR,
      errorMessage: message,
      completedAt: new Date(),
    })
  } finally {
    await temp.cleanup()
  }
}

function mimeFor(ext: "srt" | "vtt" | "ass"): string {
  return { srt: "application/x-subrip", vtt: "text/vtt", ass: "text/x-ssa" }[ext]
}

async function getExportType(exportId: string): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma")
  const record = await prisma.subtitleExport.findUnique({
    where: { id: exportId },
    select: { type: true },
  })
  return record?.type ?? null
}
