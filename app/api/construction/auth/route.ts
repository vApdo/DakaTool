/**
 * GET  /api/construction/auth  — trạng thái: đã đặt mã chưa + request này có quyền chưa.
 * POST /api/construction/auth  — nhập mã: đúng → set cookie quản lý.
 *   First-run: nếu CHƯA có mã nào trong hệ thống, mã nhập lần đầu trở thành mã quản lý.
 */
import type { NextRequest } from "next/server"
import { handleError, ok, errorResponse } from "@/lib/http"
import {
  attachManagerCookie,
  hasManagerAccess,
  isCodeConfigured,
  setManagerCode,
  verifyCode,
} from "@/lib/construction/access"
import { authSchema } from "@/lib/construction/schemas"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    return ok({
      configured: await isCodeConfigured(),
      authorized: await hasManagerAccess(request),
    })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = authSchema.parse(await request.json())

    if (!(await isCodeConfigured())) {
      // First-run: đặt mã đầu tiên.
      await setManagerCode(code)
    } else if (!(await verifyCode(code))) {
      return errorResponse("UNAUTHORIZED", "Mã không đúng.", 401)
    }

    const response = ok({ authorized: true })
    attachManagerCookie(response, code)
    return response
  } catch (err) {
    return handleError(err)
  }
}
