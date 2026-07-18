/**
 * Queue Auto Subtitle (phía producer — API route handler enqueue job).
 * Worker tiêu thụ ở workers/subtitle-worker.ts.
 */
import { Queue } from "bullmq"
import { JOB_NAMES, SUBTITLE_QUEUE_NAME } from "@/lib/auto-subtitle/constants"
import { getRedisConnection } from "./connection"

export interface TranscribeJobData {
  jobId: string
  projectId: string
}

export interface RenderJobData {
  jobId: string
  projectId: string
  exportId: string
}

export interface ExportJobData {
  jobId: string
  projectId: string
  exportId: string
}

export type SubtitleJobData = TranscribeJobData | RenderJobData | ExportJobData

let queue: Queue<SubtitleJobData> | undefined

export function getSubtitleQueue(): Queue<SubtitleJobData> {
  if (!queue) {
    queue = new Queue<SubtitleJobData>(SUBTITLE_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    })
  }
  return queue
}

export async function enqueueTranscribe(data: TranscribeJobData): Promise<string> {
  const job = await getSubtitleQueue().add(JOB_NAMES.transcribe, data)
  return job.id as string
}

export async function enqueueRender(data: RenderJobData): Promise<string> {
  const job = await getSubtitleQueue().add(JOB_NAMES.render, data)
  return job.id as string
}

export async function enqueueExport(data: ExportJobData): Promise<string> {
  const job = await getSubtitleQueue().add(JOB_NAMES.export, data)
  return job.id as string
}
