import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { AccessError, handleError, ok } from "@/lib/http"
import { requireApprover } from "@/lib/marketing/approver"
import { approvePost, cancelPost, rejectPost, submitPost } from "@/lib/marketing/repository"
import { reviewSchema } from "@/lib/marketing/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Tải tối đa 10 ảnh lên Facebook có thể vượt thời gian mặc định của hàm serverless.
export const maxDuration = 60

type Params = { params: { id: string; action: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAppAccess(request)
    switch (params.action) {
      case "submit":
        return ok(await submitPost(params.id))
      case "approve":
        requireApprover(request)
        return ok(await approvePost(params.id, reviewSchema.parse(await request.json())))
      case "reject":
        requireApprover(request)
        return ok(await rejectPost(params.id, reviewSchema.parse(await request.json())))
      case "cancel":
        requireApprover(request)
        return ok(await cancelPost(params.id))
      default:
        throw new AccessError("Thao tác không tồn tại.", "not_found")
    }
  } catch (error) {
    return handleError(error)
  }
}
