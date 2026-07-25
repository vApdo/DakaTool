/**
 * POST /api/construction/projects/:id/updates — đăng nhật ký tiến độ (cần mã quản lý).
 *
 * Multipart: field "meta" = JSON {note, authorName?, captions[]}, các field "photos" = ảnh.
 * Ảnh được xác minh bằng MAGIC BYTES (không tin MIME client), key do server sinh.
 */
import type { NextRequest } from "next/server"
import { errorResponse, handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import {
  IMAGE_MIME,
  photoStorageKey,
  sniffImage,
} from "@/lib/construction/media"
import * as repo from "@/lib/construction/repository"
import {
  MAX_PHOTOS_PER_UPDATE,
  MAX_PHOTO_BYTES,
  createUpdateMetaSchema,
} from "@/lib/construction/schemas"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)

    const form = await request.formData()
    const metaRaw = form.get("meta")
    const meta = createUpdateMetaSchema.parse(
      typeof metaRaw === "string" ? JSON.parse(metaRaw) : {},
    )

    const files = form.getAll("photos").filter((f): f is File => f instanceof File)
    if (files.length > MAX_PHOTOS_PER_UPDATE) {
      return errorResponse("TOO_MANY_PHOTOS", `Tối đa ${MAX_PHOTOS_PER_UPDATE} ảnh mỗi lần.`, 400)
    }

    const storage = getStorage()
    const photos: Array<{ storageKey: string; caption?: string }> = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > MAX_PHOTO_BYTES) {
        return errorResponse("PHOTO_TOO_LARGE", `Ảnh "${file.name}" vượt 10MB.`, 413)
      }
      const buf = Buffer.from(await file.arrayBuffer())
      const kind = sniffImage(buf)
      if (!kind) {
        return errorResponse("INVALID_IMAGE", `File "${file.name}" không phải ảnh JPEG/PNG/WebP.`, 400)
      }
      const key = photoStorageKey(params.id, kind)
      await storage.putObject({
        key,
        body: buf,
        contentType: IMAGE_MIME[kind],
        contentLength: buf.length,
      })
      photos.push({ storageKey: key, caption: meta.captions?.[i] || undefined })
    }

    const update = await repo.createUpdate(params.id, {
      note: meta.note,
      authorName: meta.authorName,
      photos,
    })
    return ok({ update }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
