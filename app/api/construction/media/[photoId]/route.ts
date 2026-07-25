/**
 * GET /api/construction/media/:photoId — stream ảnh nhật ký từ storage.
 * Mở cho người xem (mạng nội bộ). Ảnh bất biến nên cache dài phía trình duyệt.
 */
import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { handleError } from "@/lib/http"
import * as repo from "@/lib/construction/repository"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"

function contentTypeFromKey(key: string): string {
  if (key.endsWith(".png")) return "image/png"
  if (key.endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { photoId: string } },
) {
  try {
    const photo = await repo.getPhotoForStream(params.photoId)
    const storage = getStorage()

    const presigned = await storage.createDownloadUrl?.(photo.storageKey)
    if (presigned) return NextResponse.redirect(presigned)

    const nodeStream = await storage.getObjectStream(photo.storageKey)
    return new NextResponse(Readable.toWeb(nodeStream) as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentTypeFromKey(photo.storageKey),
        // Ảnh không đổi sau khi đăng → cache mạnh.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (err) {
    return handleError(err)
  }
}
