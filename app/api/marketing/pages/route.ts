import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { getConnectionInfo } from "@/lib/marketing/connections"
import { isFacebookConfigured } from "@/lib/marketing/facebook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    if (!isFacebookConfigured()) return ok({ configured: false, pages: [], connectedBy: null, connectedAt: null })
    return ok({ configured: true, ...(await getConnectionInfo()) })
  } catch (error) {
    return handleError(error)
  }
}
