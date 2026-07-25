/** PATCH /api/construction/projects/:id/milestones — lưu bảng hạng mục (cần mã quản lý). */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import * as repo from "@/lib/construction/repository"
import { bulkMilestonesSchema } from "@/lib/construction/schemas"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)
    const input = bulkMilestonesSchema.parse(await request.json())
    await repo.saveMilestones(params.id, input)
    return ok({ saved: input.milestones.length })
  } catch (err) {
    return handleError(err)
  }
}
