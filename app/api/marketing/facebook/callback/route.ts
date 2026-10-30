import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { hasAppAccess } from "@/lib/access"
import { replaceConnections } from "@/lib/marketing/connections"
import { createFacebookClient, facebookAppConfig } from "@/lib/marketing/facebook"
import { STATE_COOKIE, backToMarketing, callbackUrl } from "@/lib/marketing/oauth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Facebook chuyển về đây sau khi người dùng đồng ý (hoặc huỷ) cấp quyền. */
export async function GET(request: NextRequest) {
  if (!(await hasAppAccess(request))) return NextResponse.redirect(new URL("/marketing", request.url))
  const config = facebookAppConfig()
  if (!config) return backToMarketing(request, "not_configured")

  const params = request.nextUrl.searchParams
  if (!sameState(request.cookies.get(STATE_COOKIE)?.value, params.get("state"))) return backToMarketing(request, "failed")
  const code = params.get("code")
  if (!code) return backToMarketing(request, "cancelled")

  try {
    const client = createFacebookClient(async () => null)
    const userToken = await client.exchangeCode({ ...config, redirectUri: callbackUrl(request), code })
    const { userName, pages } = await client.managedPages(userToken)
    if (pages.length === 0) return backToMarketing(request, "no_pages")
    await replaceConnections(pages, userName)
    return backToMarketing(request, "connected")
  } catch (error) {
    console.error("[marketing] Kết nối Facebook thất bại:", error instanceof Error ? error.message : error)
    return backToMarketing(request, "failed")
  }
}
