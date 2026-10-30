/** Phần dùng chung giữa route bắt đầu đăng nhập Facebook và route Facebook gọi lại. */
import { NextResponse, type NextRequest } from "next/server"

export const STATE_COOKIE = "dakatool_mkt_fb_state"
export const STATE_COOKIE_PATH = "/api/marketing/facebook"

/** Kết quả hiện cho người dùng ở trang Marketing (`?fb=...`). */
export type ConnectResult = "connected" | "cancelled" | "no_pages" | "need_approver" | "not_configured" | "failed"

export function callbackUrl(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/marketing/facebook/callback`
}

export function backToMarketing(request: NextRequest, result: ConnectResult): NextResponse {
  const response = NextResponse.redirect(new URL(`/marketing?fb=${result}`, request.url))
  response.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 })
  return response
}
