import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { requireApprover } from "@/lib/marketing/approver"
import {
  deleteNeedsApprover,
  deletePost,
  getPost,
  getPostStatusForDelete,
  updatePost,
} from "@/lib/marketing/repository"
import { postInputSchema } from "@/lib/marketing/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAppAccess(request)
    return ok(await getPost(params.id))
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAppAccess(request)
    const input = postInputSchema.parse(await request.json())
    return ok(await updatePost(params.id, input))
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireAppAccess(request)
    if (deleteNeedsApprover(await getPostStatusForDelete(params.id))) requireApprover(request)
    await deletePost(params.id)
    return ok({ deleted: true as const })
  } catch (error) {
    return handleError(error)
  }
}
