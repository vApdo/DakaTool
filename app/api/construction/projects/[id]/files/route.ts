/**
 * POST /api/construction/projects/:id/files — upload tài liệu kế hoạch/dự toán
 * (PDF, Excel, Word, CSV ≤ 25MB). Cần mã quản lý.
 */
import type { NextRequest } from "next/server"
import { errorResponse, handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import { docExtAllowed, docStorageKey } from "@/lib/construction/media"
import * as repo from "@/lib/construction/repository"
import { FILE_KINDS, MAX_DOC_BYTES } from "@/lib/construction/schemas"
import { getStorage } from "@/lib/storage"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireManager(request)

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return errorResponse("INVALID_FILE", "Thiếu file tài liệu.", 400)
    }
    if (file.size > MAX_DOC_BYTES) {
      return errorResponse("FILE_TOO_LARGE", "Tài liệu vượt 25MB.", 413)
    }
    if (!docExtAllowed(file.name)) {
      return errorResponse(
        "INVALID_FILE",
        "Chỉ nhận .pdf, .xls, .xlsx, .doc, .docx, .csv.",
        400,
      )
    }

    const kindRaw = form.get("kind")
    const kind = (FILE_KINDS as readonly string[]).includes(String(kindRaw))
      ? (kindRaw as "PLAN" | "BUDGET" | "OTHER")
      : "OTHER"

    // Kiểm tra công trình tồn tại TRƯỚC khi ghi file, tránh để lại file mồ côi
    // trong storage khi id sai.
    await repo.assertProjectExists(params.id)

    const buf = Buffer.from(await file.arrayBuffer())
    const key = docStorageKey(params.id, file.name)
    const storage = getStorage()
    await storage.putObject({
      key,
      body: buf,
      contentType: file.type || "application/octet-stream",
      contentLength: buf.length,
    })

    try {
      const { id } = await repo.createFile(params.id, {
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
  } catch (err) {
    return handleError(err)
  }
}
