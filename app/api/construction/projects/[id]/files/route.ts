/**
 * POST /api/construction/projects/:id/files — upload tài liệu kế hoạch/dự toán
 * (PDF, Excel, Word, CSV ≤ 25MB). Cần mã quản lý.
 *
 * Hai luồng như route updates: JSON (file đã PUT thẳng lên S3/R2 qua presigned URL)
 * hoặc multipart (driver local).
 */
import type { NextRequest } from "next/server"
import { errorResponse, handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import { docExtAllowed, docStorageKey } from "@/lib/construction/media"
import * as repo from "@/lib/construction/repository"
import { FILE_KINDS, MAX_DOC_BYTES, attachFileJsonSchema } from "@/lib/construction/schemas"
import { verifyUploadedDoc } from "@/lib/construction/verify-upload"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)

    const contentType = request.headers.get("content-type") ?? ""
    return contentType.includes("application/json")
      ? await attachFromStorageKey(request, params.id)
      : await uploadFromMultipart(request, params.id)
  } catch (err) {
    return handleError(err)
  }
}

/** Luồng upload trực tiếp: file đã nằm trên storage, chỉ còn xác minh rồi ghi DB. */
async function attachFromStorageKey(request: NextRequest, projectId: string) {
  const body = attachFileJsonSchema.parse(await request.json())
  if (!docExtAllowed(body.filename)) {
    return errorResponse("INVALID_FILE", "Chỉ nhận .pdf, .xls, .xlsx, .doc, .docx, .csv.", 400)
  }
  await repo.assertProjectExists(projectId)

  const storage = getStorage()
  const verified = await verifyUploadedDoc(
    storage,
    projectId,
    body.storageKey,
    body.filename,
    MAX_DOC_BYTES,
  )
  if (!verified.ok) {
    // Chỉ dọn khi key đã xác nhận thuộc công trình này.
    if (verified.code !== "INVALID_KEY") {
      await storage.deleteObject(body.storageKey).catch(() => undefined)
    }
    return errorResponse(
      verified.code,
      verified.message,
      verified.code === "FILE_TOO_LARGE" ? 413 : 400,
    )
  }

  try {
    const { id } = await repo.createFile(projectId, {
      kind: body.kind,
      filename: body.filename.slice(0, 200),
      storageKey: body.storageKey,
      sizeBytes: verified.value,
    })
    return ok({ id }, { status: 201 })
  } catch (err) {
    await storage.deleteObject(body.storageKey).catch(() => undefined)
    throw err
  }
}

/** Luồng multipart cũ: file đi qua route handler (driver local). */
async function uploadFromMultipart(request: NextRequest, projectId: string) {
  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return errorResponse("INVALID_FILE", "Thiếu file tài liệu.", 400)
  }
  if (file.size > MAX_DOC_BYTES) {
    return errorResponse("FILE_TOO_LARGE", "Tài liệu vượt 25MB.", 413)
  }
  if (!docExtAllowed(file.name)) {
    return errorResponse("INVALID_FILE", "Chỉ nhận .pdf, .xls, .xlsx, .doc, .docx, .csv.", 400)
  }

  const kindRaw = form.get("kind")
  const kind = (FILE_KINDS as readonly string[]).includes(String(kindRaw))
    ? (kindRaw as "PLAN" | "BUDGET" | "OTHER")
    : "OTHER"

  // Kiểm tra công trình tồn tại TRƯỚC khi ghi file, tránh để lại file mồ côi
  // trong storage khi id sai.
  await repo.assertProjectExists(projectId)

  const buf = Buffer.from(await file.arrayBuffer())
  const key = docStorageKey(projectId, file.name)
  const storage = getStorage()
  await storage.putObject({
    key,
    body: buf,
    contentType: file.type || "application/octet-stream",
    contentLength: buf.length,
  })

  try {
    const { id } = await repo.createFile(projectId, {
      kind,
      filename: file.name.slice(0, 200),
      storageKey: key,
      sizeBytes: buf.length,
    })
    return ok({ id }, { status: 201 })
  } catch (err) {
    await storage.deleteObject(key).catch(() => undefined)
    throw err
  }
}
