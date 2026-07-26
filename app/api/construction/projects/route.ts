/**
 * GET  /api/construction/projects — danh sách công trình (mở).
 * POST /api/construction/projects — tạo công trình (cần mã quản lý).
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import * as repo from "@/lib/construction/repository"
import { createProjectSchema } from "@/lib/construction/schemas"

export const runtime = "nodejs"

export async function GET() {
  try {
    return ok({ projects: await repo.listProjects() })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireManager(request)
    const input = createProjectSchema.parse(await request.json())
    const { id } = await repo.createProject(input)
    return ok({ id }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
