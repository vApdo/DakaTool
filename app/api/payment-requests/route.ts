import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { createPaymentHistory, listPaymentHistory } from "@/lib/payment-history/repository"
import { createPaymentHistorySchema } from "@/lib/payment-history/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    return ok({ records: await listPaymentHistory() })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const input = createPaymentHistorySchema.parse(await request.json())
    return ok(await createPaymentHistory(input), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
