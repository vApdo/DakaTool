import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { AccessError, handleError, ok } from "@/lib/http"
import { deletePaymentHistory, getPaymentHistory } from "@/lib/payment-history/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAppAccess(request)
    const record = await getPaymentHistory(params.id)
    if (!record) throw new AccessError("Không tìm thấy phiếu đã lưu.", "not_found")
    return ok(record)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAppAccess(request)
    if (!(await deletePaymentHistory(params.id))) {
      throw new AccessError("Không tìm thấy phiếu đã lưu.", "not_found")
    }
    return ok({ deleted: true as const })
  } catch (error) {
    return handleError(error)
  }
}
