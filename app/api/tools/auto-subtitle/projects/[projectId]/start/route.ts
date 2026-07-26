/**
 * POST /api/tools/auto-subtitle/projects/:projectId/start
 * Tạo job transcribe (chống trùng) rồi enqueue vào BullMQ.
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { enqueueTranscribe } from "@/lib/queue/subtitle-queue"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    // Body tuỳ chọn: { separateVocals?: boolean } — đặt trước khi enqueue.
    const body = (await request.json().catch(() => null)) as {
      separateVocals?: unknown
    } | null
    if (body && typeof body.separateVocals === "boolean") {
      await repo.setSeparateVocals(params.projectId, ownerId, body.separateVocals)
    }
    const { jobId } = await repo.createTranscribeJobIfNone(params.projectId, ownerId)
    const bullJobId = await enqueueTranscribe({ jobId, projectId: params.projectId })
    await repo.attachBullJobId(jobId, bullJobId)
    return ok({ jobId, status: "QUEUED" }, { status: 202 })
  } catch (err) {
    return handleError(err)
  }
}
