/**
 * POST /api/construction/projects/:id/updates — đăng nhật ký tiến độ (cần mã quản lý).
 *
 * Hai luồng, chọn theo Content-Type:
 * - application/json — ảnh đã được client PUT thẳng lên S3/R2 qua presigned URL,
 *   body chỉ chứa storageKey. Dùng khi chạy serverless (body function tối đa 4.5MB).
 * - multipart/form-data — luồng cũ, ảnh đi qua route handler. Dùng với driver local.
 *
 * Cả hai luồng đều xác minh ảnh bằng MAGIC BYTES (không tin MIME/đuôi client) và
 * key luôn do server sinh.
 */
import type { NextRequest } from "next/server"
import { errorResponse, handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import { IMAGE_MIME, photoStorageKey, sniffImage } from "@/lib/construction/media"
import * as repo from "@/lib/construction/repository"
import {
  MAX_PHOTOS_PER_UPDATE,
  MAX_PHOTO_BYTES,
  createUpdateJsonSchema,
  createUpdateMetaSchema,
} from "@/lib/construction/schemas"
import { verifyUploadedPhoto } from "@/lib/construction/verify-upload"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)

    const contentType = request.headers.get("content-type") ?? ""
    return contentType.includes("application/json")
      ? await postFromStorageKeys(request, params.id)
      : await postFromMultipart(request, params.id)
  } catch (err) {
    return handleError(err)
  }
}

/** Luồng upload trực tiếp: ảnh đã nằm trên storage, chỉ còn xác minh rồi ghi DB. */
async function postFromStorageKeys(request: NextRequest, projectId: string) {
  const body = createUpdateJsonSchema.parse(await request.json())
  await repo.assertProjectExists(projectId)

  const storage = getStorage()
  const items = body.photos ?? []
  const photos: Array<{ storageKey: string; caption?: string }> = []

  // Chỉ dọn những key ĐÃ xác nhận thuộc công trình này — không bao giờ gọi delete
  // trên key client khai bừa, nếu không route này thành công cụ xoá file công trình khác.
  const owned: string[] = []
  const cleanup = () => Promise.allSettled(owned.map((key) => storage.deleteObject(key)))

  for (const item of items) {
    const verified = await verifyUploadedPhoto(storage, projectId, item.storageKey, MAX_PHOTO_BYTES)
    if (!verified.ok) {
      if (verified.code !== "INVALID_KEY") owned.push(item.storageKey)
      await cleanup()
      return errorResponse(
        verified.code,
        verified.message,
        verified.code === "PHOTO_TOO_LARGE" ? 413 : 400,
      )
    }
    owned.push(item.storageKey)
    photos.push({ storageKey: item.storageKey, caption: item.caption || undefined })
  }

  try {
    const update = await repo.createUpdate(projectId, {
      note: body.note,
      authorName: body.authorName,
      milestoneUpdate: body.milestoneUpdate,
      photos,
    })
    return ok({ update }, { status: 201 })
  } catch (err) {
    await cleanup()
    throw err
  }
}

/** Luồng multipart cũ: ảnh đi qua route handler (driver local). */
async function postFromMultipart(request: NextRequest, projectId: string) {
  const form = await request.formData()
  const metaRaw = form.get("meta")
  let metaJson: unknown = {}
  if (typeof metaRaw === "string") {
    try {
      metaJson = JSON.parse(metaRaw)
    } catch {
      return errorResponse("INVALID_META", "Dữ liệu gửi lên không hợp lệ.", 400)
    }
  }
  const meta = createUpdateMetaSchema.parse(metaJson)

  const files = form.getAll("photos").filter((f): f is File => f instanceof File)
  if (files.length > MAX_PHOTOS_PER_UPDATE) {
    return errorResponse("TOO_MANY_PHOTOS", `Tối đa ${MAX_PHOTOS_PER_UPDATE} ảnh mỗi lần.`, 400)
  }

  // Kiểm tra công trình tồn tại TRƯỚC khi ghi ảnh vào storage.
  await repo.assertProjectExists(projectId)

  const storage = getStorage()
  const photos: Array<{ storageKey: string; caption?: string }> = []
  // Ảnh đã ghi vào storage nhưng chưa lưu DB — phải dọn nếu có lỗi giữa chừng.
  const cleanup = () => Promise.allSettled(photos.map((p) => storage.deleteObject(p.storageKey)))

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > MAX_PHOTO_BYTES) {
        await cleanup()
        return errorResponse("PHOTO_TOO_LARGE", `Ảnh "${file.name}" vượt 10MB.`, 413)
      }
      const buf = Buffer.from(await file.arrayBuffer())
      const kind = sniffImage(buf)
      if (!kind) {
        await cleanup()
        return errorResponse(
          "INVALID_IMAGE",
          `File "${file.name}" không phải ảnh JPEG/PNG/WebP.`,
          400,
        )
      }
      const key = photoStorageKey(projectId, kind)
      await storage.putObject({
        key,
        body: buf,
        contentType: IMAGE_MIME[kind],
        contentLength: buf.length,
      })
      photos.push({ storageKey: key, caption: meta.captions?.[i] || undefined })
    }

    const update = await repo.createUpdate(projectId, {
      note: meta.note,
      authorName: meta.authorName,
      milestoneUpdate: meta.milestoneUpdate,
      photos,
    })
    return ok({ update }, { status: 201 })
  } catch (err) {
    await cleanup()
    throw err
  }
}
