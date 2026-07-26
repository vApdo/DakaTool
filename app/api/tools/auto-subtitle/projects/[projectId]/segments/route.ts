/** PATCH /api/tools/auto-subtitle/projects/:projectId/segments — cập nhật nhiều segment. */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { bulkUpdateSegmentsSchema } from "@/lib/auto-subtitle/schemas"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const body = bulkUpdateSegmentsSchema.parse(await request.json())
    await repo.bulkUpdateSegments(params.projectId, ownerId, body.segments)
    return ok({ updated: body.segments.length })
  } catch (err) {
    return handleError(err)
  }
}
