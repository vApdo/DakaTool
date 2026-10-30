import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { requireApprover } from "@/lib/marketing/approver"
import { disconnectAll } from "@/lib/marketing/connections"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Ngắt kết nối: xoá mọi Page token đã lưu. Bài đã hẹn giờ trên Facebook vẫn tự đăng. */
export async function DELETE(request: NextRequest) {
  try {
    await requireAppAccess(request)
    requireApprover(request)
    await disconnectAll()
    return ok({ disconnected: true })
  } catch (error) {
    return handleError(error)
  }
}
