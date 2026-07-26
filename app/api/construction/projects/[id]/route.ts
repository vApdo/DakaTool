/**
 * GET   /api/construction/projects/:id — chi tiết công trình (mở).
 * PATCH /api/construction/projects/:id — sửa thông tin (cần mã quản lý).
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import * as repo from "@/lib/construction/repository"
import { updateProjectSchema } from "@/lib/construction/schemas"

export const runtime = "nodejs"

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return ok({ project: await repo.getProjectDetail(params.id) })
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)
    const input = updateProjectSchema.parse(await request.json())
    await repo.updateProject(params.id, input)
    return ok({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}
