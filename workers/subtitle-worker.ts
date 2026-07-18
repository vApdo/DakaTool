/**
 * Worker Auto Subtitle — tiêu thụ queue `dakatool-auto-subtitle`.
 *
 * Chạy như tiến trình Node riêng (npm run worker:subtitle), KHÔNG nằm trong Next.js.
 * concurrency = 1 để không transcribe hai video cùng lúc (mặc định, cấu hình qua env).
 *
 * Đây là ranh giới tin cậy: worker gọi Python engine bằng spawn + mảng tham số.
 */
import { Worker } from "bullmq"
import { JOB_NAMES, SUBTITLE_QUEUE_NAME, WORKER_CONCURRENCY } from "@/lib/auto-subtitle/constants"
import { getRedisConnection } from "@/lib/queue/connection"
import type { SubtitleJobData } from "@/lib/queue/subtitle-queue"
import { processGenerateExport } from "./processors/generate-export"
import { processRenderVideo } from "./processors/render-video"
import { processTranscribe } from "./processors/transcribe-video"

const worker = new Worker<SubtitleJobData>(
  SUBTITLE_QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.transcribe:
        return processTranscribe(job as never)
      case JOB_NAMES.render:
        return processRenderVideo(job as never)
      case JOB_NAMES.export:
        return processGenerateExport(job as never)
      default:
        throw new Error(`Job không hỗ trợ: ${job.name}`)
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: WORKER_CONCURRENCY,
  },
)

worker.on("ready", () => {
  console.log(`[subtitle-worker] sẵn sàng, queue=${SUBTITLE_QUEUE_NAME}, concurrency=${WORKER_CONCURRENCY}`)
})

worker.on("failed", (job, err) => {
  console.error(`[subtitle-worker] job ${job?.id} (${job?.name}) thất bại:`, err.message)
})

worker.on("error", (err) => {
  console.error("[subtitle-worker] lỗi worker:", err.message)
})

async function shutdown(signal: string) {
  console.log(`[subtitle-worker] nhận ${signal}, đang đóng...`)
  await worker.close()
  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))
