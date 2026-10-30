import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { AccessError, handleError, ok } from "@/lib/http"
import { cancelPost, publishPost } from "@/lib/marketing/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Tải tối đa 10 ảnh lên Facebook có thể vượt thời gian mặc định của hàm serverless.
export const maxDuration = 60

type Params = { params: { id: string; action: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAppAccess(request)
    switch (params.action) {
      case "publish":
        return ok(await publishPost(params.id))
      case "cancel":
        return ok(await cancelPost(params.id))
      default:
        throw new AccessError("Thao tác không tồn tại.", "not_found")
    }
  } catch (error) {
    return handleError(error)
  }
}
