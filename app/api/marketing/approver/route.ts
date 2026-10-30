import type { NextRequest } from "next/server"
import { z } from "zod"
import { requestIp, requireAppAccess } from "@/lib/access"
import { errorResponse, handleError, ok } from "@/lib/http"
import {
  approverAttempts,
  attachApproverCookie,
  clearApproverCookie,
  getApproverCode,
  hasApproverAccess,
  verifyApproverCode,
} from "@/lib/marketing/approver"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const loginSchema = z.object({ code: z.string().trim().min(4, "Mã duyệt phải có ít nhất 4 ký tự.").max(128) })

export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    return ok({ configured: getApproverCode() !== null, authorized: hasApproverAccess(request) })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const ip = requestIp(request)
    if (!(await approverAttempts.allowed(ip))) {
      return errorResponse("TOO_MANY_ATTEMPTS", "Nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.", 429)
    }
    const { code } = loginSchema.parse(await request.json())
    if (!verifyApproverCode(code)) {
      await approverAttempts.recordFailure(ip)
      return errorResponse("UNAUTHORIZED", "Mã duyệt không đúng.", 401)
    }
    await approverAttempts.clear(ip)
    const response = ok({ authorized: true })
    attachApproverCookie(response, getApproverCode() ?? code)
    return response
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE() {
  const response = ok({ authorized: false })
  clearApproverCookie(response)
  return response
}
