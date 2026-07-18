/** PATCH /api/tools/auto-subtitle/projects/:projectId/style — cập nhật style phụ đề. */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { subtitleStyleSchema } from "@/lib/auto-subtitle/schemas"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const style = subtitleStyleSchema.parse(await request.json())
    await repo.updateStyle(params.projectId, ownerId, style)
    return ok({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}
