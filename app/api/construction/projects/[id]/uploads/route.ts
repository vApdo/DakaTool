/**
 * POST /api/construction/projects/:id/uploads — xin vé upload thẳng lên storage.
 *
 * Serverless (Vercel) giới hạn body của function ở 4.5MB — không đủ cho 10 ảnh công
 * trường hay bản vẽ PDF vài chục MB. Nên client PUT thẳng lên S3/R2 bằng presigned
 * URL rồi chỉ gửi key về trong bước sau.
 *
 * Driver local (chạy dev / VPS) không có presigned URL → trả direct:false để client
 * quay lại luồng multipart cũ. Key LUÔN do server sinh, không nhận từ client.
 */
import type { NextRequest } from "next/server"
import { errorResponse, handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import {
  docExtAllowed,
  docStorageKey,
  photoStorageKey,
  type ImageKind,
} from "@/lib/construction/media"
import * as repo from "@/lib/construction/repository"
import {
  ALLOWED_PHOTO_MIME,
  MAX_DOC_BYTES,
  MAX_PHOTO_BYTES,
  uploadTicketRequestSchema,
} from "@/lib/construction/schemas"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const maxDuration = 30

const MIME_TO_KIND: Record<string, ImageKind> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)

    const body = uploadTicketRequestSchema.parse(await request.json())
    const storage = getStorage()

    // Local disk: không có presigned URL → client dùng multipart như cũ.
    if (!storage.createUploadUrl) {
      return ok({ direct: false })
    }

    await repo.assertProjectExists(params.id)

    if (body.target === "photo") {
      for (const item of body.items) {
        if (!(ALLOWED_PHOTO_MIME as readonly string[]).includes(item.contentType)) {
          return errorResponse("INVALID_IMAGE", "Chỉ nhận ảnh JPEG/PNG/WebP.", 400)
        }
        if (item.sizeBytes > MAX_PHOTO_BYTES) {
          return errorResponse("PHOTO_TOO_LARGE", `Ảnh "${item.filename}" vượt 10MB.`, 413)
        }
      }

      const uploads = await Promise.all(
        body.items.map((item) =>
          storage.createUploadUrl!({
            key: photoStorageKey(params.id, MIME_TO_KIND[item.contentType]),
            contentType: item.contentType,
            maxSizeBytes: MAX_PHOTO_BYTES,
          }),
        ),
      )
      return ok({ direct: true, uploads })
    }

    // target === "doc": mỗi lần một tài liệu.
    if (body.items.length !== 1) {
      return errorResponse("INVALID_REQUEST", "Mỗi lần chỉ tải lên một tài liệu.", 400)
    }
    const item = body.items[0]
    if (!docExtAllowed(item.filename)) {
      return errorResponse("INVALID_FILE", "Chỉ nhận .pdf, .xls, .xlsx, .doc, .docx, .csv.", 400)
    }
    if (item.sizeBytes > MAX_DOC_BYTES) {
      return errorResponse("FILE_TOO_LARGE", "Tài liệu vượt 25MB.", 413)
    }

    const upload = await storage.createUploadUrl({
      key: docStorageKey(params.id, item.filename),
      contentType: item.contentType || "application/octet-stream",
      maxSizeBytes: MAX_DOC_BYTES,
    })
    return ok({ direct: true, uploads: [upload] })
  } catch (err) {
    return handleError(err)
  }
}
