/**
 * POST /api/tools/auto-subtitle/projects/:projectId/exports
 * Tạo bản export (SRT/VTT/ASS/BURNED_MP4) và enqueue job sinh file tương ứng.
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { createExportSchema } from "@/lib/auto-subtitle/schemas"
import { enqueueExport, enqueueRender } from "@/lib/queue/subtitle-queue"

export const runtime = "nodejs"

const EXPORT_META: Record<string, { ext: string; mime: string }> = {
  SRT: { ext: "srt", mime: "application/x-subrip" },
  VTT: { ext: "vtt", mime: "text/vtt" },
  ASS: { ext: "ass", mime: "text/x-ssa" },
  BURNED_MP4: { ext: "mp4", mime: "video/mp4" },
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const body = createExportSchema.parse(await request.json())
    const meta = EXPORT_META[body.type]

    // BURNED_MP4 có thể kèm style ghi đè trước khi render.
    if (body.type === "BURNED_MP4" && body.style) {
      await repo.updateStyle(params.projectId, ownerId, body.style)
    }

    const { exportId } = await repo.createExport(params.projectId, ownerId, {
      type: body.type,
      filename: `subtitle.${meta.ext}`,
      mimeType: meta.mime,
    })

    // Tạo bản ghi job để theo dõi trạng thái.
    const jobType = body.type === "BURNED_MP4" ? "RENDER_VIDEO" : "GENERATE_EXPORT"
    const { jobId } = await repo.createExportJob(params.projectId, jobType)

    if (body.type === "BURNED_MP4") {
      const bullJobId = await enqueueRender({ jobId, projectId: params.projectId, exportId })
      await repo.attachBullJobId(jobId, bullJobId)
    } else {
      const bullJobId = await enqueueExport({ jobId, projectId: params.projectId, exportId })
      await repo.attachBullJobId(jobId, bullJobId)
    }

    return ok({ exportId, status: "PENDING" }, { status: 202 })
  } catch (err) {
    return handleError(err)
  }
}
