/** PATCH /api/tools/auto-subtitle/projects/:projectId/segments/:segmentId — cập nhật 1 segment. */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { updateSegmentSchema } from "@/lib/auto-subtitle/schemas"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; segmentId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const patch = updateSegmentSchema.parse(await request.json())
    await repo.updateSegment(params.projectId, ownerId, params.segmentId, patch)
    return ok({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}
