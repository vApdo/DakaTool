/**
 * GET  /api/construction/auth  — trạng thái: đã đặt mã chưa + request này có quyền chưa.
 * POST /api/construction/auth  — nhập mã: đúng → set cookie quản lý.
 *   First-run: nếu CHƯA có mã nào trong hệ thống, mã nhập lần đầu trở thành mã quản lý.
 */
import type { NextRequest } from "next/server"
import { handleError, ok, errorResponse } from "@/lib/http"
import {
  attachManagerCookie,
  checkRateLimit,
  clearAttempts,
  hasManagerAccess,
  isCodeConfigured,
  recordFailedAttempt,
  tryClaimManagerCode,
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
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    if (!checkRateLimit(ip)) {
      return errorResponse(
        "TOO_MANY_ATTEMPTS",
        "Nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.",
        429,
      )
    }

    const { code } = authSchema.parse(await request.json())

    // First-run: giành quyền đặt mã một cách nguyên tử. Nếu thua (ai đó vừa đặt
    // trước) thì rơi xuống nhánh kiểm tra mã như bình thường.
    const claimed = (await isCodeConfigured()) ? false : await tryClaimManagerCode(code)
    if (!claimed && !(await verifyCode(code))) {
      recordFailedAttempt(ip)
      return errorResponse("UNAUTHORIZED", "Mã không đúng.", 401)
    }

    clearAttempts(ip)
    const response = ok({ authorized: true })
    attachManagerCookie(response, code)
    return response
  } catch (err) {
    return handleError(err)
  }
}
