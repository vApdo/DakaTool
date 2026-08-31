import type { NextRequest } from "next/server"
import { z } from "zod"
import {
  attachAccessCookie,
  checkAccessRateLimit,
  clearAccessAttempts,
  clearAccessCookie,
  getAccessCode,
  hasAppAccess,
  isAccessCodeConfigured,
  recordFailedAccessAttempt,
  requestIp,
  verifyAccessCode,
} from "@/lib/access"
import { errorResponse, handleError, ok } from "@/lib/http"

export const runtime = "nodejs"

const loginSchema = z.object({
  code: z.string().trim().min(4, "Mã truy cập phải có ít nhất 4 ký tự.").max(128),
})

export async function GET(request: NextRequest) {
  try {
    return ok({
      configured: await isAccessCodeConfigured(),
      authorized: await hasAppAccess(request),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = requestIp(request)
    if (!(await checkAccessRateLimit(ip))) {
      return errorResponse("TOO_MANY_ATTEMPTS", "Nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.", 429)
    }

    const { code } = loginSchema.parse(await request.json())
    if (!(await verifyAccessCode(code))) {
      await recordFailedAccessAttempt(ip)
      return errorResponse("UNAUTHORIZED", "Mã truy cập không đúng.", 401)
    }

    await clearAccessAttempts(ip)
    const response = ok({ authorized: true })
    attachAccessCookie(response, (await getAccessCode()) ?? code)
    return response
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE() {
  const response = ok({ authorized: false })
  clearAccessCookie(response)
  return response
}
