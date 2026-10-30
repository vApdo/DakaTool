import { randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { hasAppAccess } from "@/lib/access"
import { createFacebookClient, facebookAppConfig } from "@/lib/marketing/facebook"
import { STATE_COOKIE, STATE_COOKIE_PATH, backToMarketing, callbackUrl } from "@/lib/marketing/oauth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Mở hộp thoại đăng nhập Facebook. Đây là link điều hướng nên lỗi quay về trang Marketing thay vì trả JSON. */
export async function GET(request: NextRequest) {
  if (!(await hasAppAccess(request))) return NextResponse.redirect(new URL("/marketing", request.url))
  const config = facebookAppConfig()
  if (!config) return backToMarketing(request, "not_configured")

  const state = randomBytes(24).toString("base64url")
  const client = createFacebookClient(async () => null)
  const response = NextResponse.redirect(client.loginUrl(config.appId, callbackUrl(request), state))
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: 10 * 60,
  })
  return response
}
