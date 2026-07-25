/** DELETE /api/construction/updates/:updateId — xóa nhật ký + ảnh (cần mã quản lý). */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import * as repo from "@/lib/construction/repository"

export const runtime = "nodejs"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { updateId: string } },
) {
  try {
    await requireManager(request)
    await repo.deleteUpdate(params.updateId)
    return ok({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}
