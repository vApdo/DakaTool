/** GET /api/tools/auto-subtitle/projects/:projectId — chi tiết project (poll khi xử lý). */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const project = await repo.getProjectDetail(params.projectId, ownerId)
    return ok({ project })
  } catch (err) {
    return handleError(err)
  }
}
