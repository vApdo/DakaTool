/** GET /api/construction/files/:fileId/download — tải tài liệu kế hoạch/dự toán. */
import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleError } from "@/lib/http"
import * as repo from "@/lib/construction/repository"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: { fileId: string } },
) {
  try {
    const file = await repo.getFileForDownload(params.fileId)
    const storage = getStorage()

    const presigned = await storage.createDownloadUrl?.(file.storageKey)
    if (presigned) return NextResponse.redirect(presigned)

    const nodeStream = await storage.getObjectStream(file.storageKey)
    return new NextResponse(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
