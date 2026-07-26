/** PATCH /api/construction/projects/:id/costs — lưu bảng dự toán chi phí (cần mã quản lý). */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import * as repo from "@/lib/construction/repository"
import { bulkCostsSchema } from "@/lib/construction/schemas"

export const runtime = "nodejs"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)
    const input = bulkCostsSchema.parse(await request.json())
    await repo.saveCostItems(params.id, input)
    return ok({ saved: input.costItems.length })
  } catch (err) {
    return handleError(err)
  }
}
