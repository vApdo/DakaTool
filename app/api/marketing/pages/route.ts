import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { getFacebookClient, isFacebookConfigured } from "@/lib/marketing/facebook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    if (!isFacebookConfigured()) return ok({ configured: false, pages: [] })
    return ok({ configured: true, pages: await getFacebookClient().listPages() })
  } catch (error) {
    return handleError(error)
  }
}
