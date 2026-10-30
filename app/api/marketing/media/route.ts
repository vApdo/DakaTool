import { Readable } from "node:stream"
import { NextResponse, type NextRequest } from "next/server"
import { requireAppAccess } from "@/lib/access"
import { AccessError, ConflictError, handleError, ok } from "@/lib/http"
import {
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  buildMediaKey,
  isMediaKey,
  isPhotoContentType,
} from "@/lib/marketing/media"
import { uploadRequestSchema } from "@/lib/marketing/schemas"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function keyParam(request: NextRequest): string {
  const key = request.nextUrl.searchParams.get("key") ?? ""
  if (!isMediaKey(key)) throw new AccessError("Không tìm thấy ảnh.", "not_found")
  return key
}

function contentTypeForKey(key: string): string {
  const entry = Object.entries(PHOTO_TYPES).find(([, ext]) => key.endsWith(ext))
  return entry?.[0] ?? "application/octet-stream"
}

/**
 * Xin chỗ tải ảnh lên. Có S3 thì trả presigned URL để trình duyệt tải thẳng
 * (tránh giới hạn dung lượng request của Vercel); storage cục bộ thì tải qua PUT bên dưới.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const input = uploadRequestSchema.parse(await request.json())
    const key = buildMediaKey(input.contentType)
    const storage = getStorage()
    if (storage.createUploadUrl) {
      const upload = await storage.createUploadUrl({ key, contentType: input.contentType, maxSizeBytes: MAX_PHOTO_BYTES })
      return ok({ key, url: upload.url, method: upload.method, headers: upload.headers })
    }
    return ok({
      key,
      url: `/api/marketing/media?key=${encodeURIComponent(key)}`,
      method: "PUT" as const,
      headers: { "Content-Type": input.contentType },
    })
  } catch (error) {
    return handleError(error)
  }
}

/** Tải ảnh lên storage cục bộ (chỉ dùng khi phát triển, không có S3). */
export async function PUT(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const key = keyParam(request)
    const storage = getStorage()
    if (storage.createUploadUrl) throw new ConflictError("Storage S3 nhận ảnh qua presigned URL, không qua máy chủ.")
    const contentType = request.headers.get("content-type") ?? ""
    if (!isPhotoContentType(contentType) || contentTypeForKey(key) !== contentType) {
      throw new ConflictError("Chỉ nhận ảnh JPG, PNG hoặc GIF.")
    }
    const body = Buffer.from(await request.arrayBuffer())
    if (body.length === 0 || body.length > MAX_PHOTO_BYTES) throw new ConflictError("Mỗi ảnh tối đa 8 MB.")
    await storage.putObject({ key, body, contentType, contentLength: body.length })
    return ok({ key })
  } catch (error) {
    return handleError(error)
  }
}

/** Xem ảnh đã tải lên (kiểm tra mã truy cập; S3 chuyển hướng sang link tạm). */
export async function GET(request: NextRequest) {
  try {
    await requireAppAccess(request)
    const key = keyParam(request)
    const storage = getStorage()
    if (storage.createDownloadUrl) {
      const url = await storage.createDownloadUrl(key, 600)
      if (url) return NextResponse.redirect(url, 302)
    }
    if (!(await storage.objectExists(key))) throw new AccessError("Không tìm thấy ảnh.", "not_found")
    const stream = Readable.toWeb(await storage.getObjectStream(key)) as ReadableStream
    return new NextResponse(stream, {
      headers: { "Content-Type": contentTypeForKey(key), "Cache-Control": "private, max-age=600" },
    })
  } catch (error) {
    return handleError(error)
  }
}
