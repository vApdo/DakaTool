/**
 * GET /api/tools/auto-subtitle/exports/:exportId/download
 * Trả file export. S3: redirect presigned URL. Local: stream file qua route.
 */
import type { ReadableStream as WebReadableStream } from "node:stream/web"
import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleError } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: { exportId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    const record = await repo.getExportForDownload(params.exportId, ownerId)
    const storage = getStorage()

    const presigned = await storage.createDownloadUrl?.(record.storageKey)
    if (presigned) {
      return NextResponse.redirect(presigned)
    }

    const nodeStream = await storage.getObjectStream(record.storageKey)
    const webStream = Readable.toWeb(nodeStream) as unknown as WebReadableStream<Uint8Array>
    return new NextResponse(webStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(record.filename)}"`,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
