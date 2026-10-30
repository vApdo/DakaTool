import type { NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { handleError, ok } from "@/lib/http"
import { createPost, listPosts } from "@/lib/marketing/repository"
import { listQuerySchema, postInputSchema } from "@/lib/marketing/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const query = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const posts = await listPosts({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    })
    return ok({ posts })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const input = postInputSchema.parse(await request.json())
    return ok(await createPost(input), { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
