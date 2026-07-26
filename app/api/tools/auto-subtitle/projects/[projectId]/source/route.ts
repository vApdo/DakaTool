/**
 * GET /api/tools/auto-subtitle/projects/:projectId/source
 * Stream video nguồn để preview trong editor (owner-checked). Hỗ trợ Range để tua.
 */
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleError } from "@/lib/auto-subtitle/http"
import { getOwnerId } from "@/lib/auto-subtitle/owner"
import { AccessError } from "@/lib/auto-subtitle/repository"
import * as repo from "@/lib/auto-subtitle/repository"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const ownerId = getOwnerId(request)
    // Kiểm quyền qua getProjectDetail (ném AccessError nếu không có quyền).
    const project = await repo.getProjectDetail(params.projectId, ownerId)
    const raw = await repo.getProjectRaw(project.id)
    if (!raw) throw new AccessError("Project không tồn tại.", "not_found")

    const storage = getStorage()
    const localPath = storage.getLocalPath?.(raw.sourceStorageKey)

    // Local: hỗ trợ Range request để video tua được.
    if (localPath) {
      const fileStat = await stat(localPath)
      const range = request.headers.get("range")
      if (range) {
        const match = range.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = Number(match[1])
          const end = match[2] ? Number(match[2]) : fileStat.size - 1
          const stream = createReadStream(localPath, { start, end })
          return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
            status: 206,
            headers: {
              "Content-Type": raw.sourceMimeType,
              "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
              "Accept-Ranges": "bytes",
              "Content-Length": String(end - start + 1),
            },
          })
        }
      }
      const stream = createReadStream(localPath)
      return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
        headers: {
          "Content-Type": raw.sourceMimeType,
          "Content-Length": String(fileStat.size),
          "Accept-Ranges": "bytes",
        },
      })
    }

    // S3: redirect presigned URL.
    const presigned = await storage.createDownloadUrl?.(raw.sourceStorageKey)
    if (presigned) return NextResponse.redirect(presigned)

    const stream = await storage.getObjectStream(raw.sourceStorageKey)
    return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
      headers: { "Content-Type": raw.sourceMimeType },
    })
  } catch (err) {
    return handleError(err)
  }
}
