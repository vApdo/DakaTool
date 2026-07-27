/**
 * POST /api/tools/auto-subtitle/projects
 *
 * Nhận video (multipart), xác minh bằng ffprobe (không tin MIME/đuôi), lưu vào storage,
 * tạo project trạng thái UPLOADED. Trả project + set cookie chủ sở hữu ẩn danh.
 *
 * Giới hạn: kích thước ≤ MAX_VIDEO_SIZE_BYTES, thời lượng ≤ MAX_VIDEO_DURATION_SECONDS.
 */
import { unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"
import {
  ALLOWED_VIDEO_EXT,
  ALLOWED_VIDEO_MIME,
  ERROR_CODES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
} from "@/lib/auto-subtitle/constants"
import { ffprobeFile, ProbeError } from "@/lib/auto-subtitle/ffprobe"
import { errorResponse, handleError, ok } from "@/lib/auto-subtitle/http"
import { OWNER_COOKIE, resolveOwnerId } from "@/lib/auto-subtitle/owner"
import * as repo from "@/lib/auto-subtitle/repository"
import { languageSchema } from "@/lib/auto-subtitle/schemas"
import { buildStorageKey, getStorage } from "@/lib/storage"

export const runtime = "nodejs"
// Vercel Hobby chặn maxDuration > 60 ngay lúc build, nên để 60 cho deploy được.
// Cấu hình này chỉ có tác dụng trên Vercel — bản self-host (VPS/Docker) bỏ qua nó,
// nên upload video dài trên VPS không bị ảnh hưởng.
export const maxDuration = 60

function extAllowed(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return (ALLOWED_VIDEO_EXT as readonly string[]).includes(ext)
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return errorResponse(ERROR_CODES.INVALID_FILE, "Thiếu file video.", 400)
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return errorResponse(ERROR_CODES.FILE_TOO_LARGE, "File vượt quá dung lượng cho phép.", 413)
    }
    if (
      !(ALLOWED_VIDEO_MIME as readonly string[]).includes(file.type) ||
      !extAllowed(file.name)
    ) {
      return errorResponse(
        ERROR_CODES.INVALID_FILE,
        "Định dạng video không hỗ trợ (chấp nhận .mp4/.mov/.webm/.mkv).",
        400,
      )
    }

    const languageParse = languageSchema.safeParse(form.get("language") ?? "auto")
    const language = languageParse.success ? languageParse.data : "auto"
    const separateVocals = form.get("separateVocals") === "true"
    const titleRaw = form.get("title")
    const title =
      typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 300) : file.name

    // Ghi ra file tạm để ffprobe (không tin metadata client).
    const buffer = Buffer.from(await file.arrayBuffer())
    const tmpPath = path.join(tmpdir(), `daka-upload-${randomUUID()}${path.extname(file.name)}`)
    await writeFile(tmpPath, buffer)

    let durationMs: number
    try {
      const probe = await ffprobeFile(tmpPath)
      if (!probe.hasVideo) {
        return errorResponse(ERROR_CODES.INVALID_FILE, "File không chứa luồng video.", 400)
      }
      durationMs = probe.durationMs
    } catch (err) {
      if (err instanceof ProbeError) {
        return errorResponse(err.code, "Không xác minh được video.", 400)
      }
      throw err
    } finally {
      await unlink(tmpPath).catch(() => undefined)
    }

    if (durationMs > MAX_VIDEO_DURATION_SECONDS * 1000) {
      return errorResponse(
        ERROR_CODES.VIDEO_TOO_LONG,
        `Video dài quá ${MAX_VIDEO_DURATION_SECONDS / 60} phút.`,
        413,
      )
    }

    const { ownerId, isNew } = resolveOwnerId(request)
    const storage = getStorage()
    const key = buildStorageKey({ projectId: "pending", kind: "source", filename: file.name })
    await storage.putObject({
      key,
      body: buffer,
      contentType: file.type,
      contentLength: buffer.length,
    })

    const project = await repo.createProject({
      ownerId,
      title,
      sourceFilename: file.name,
      sourceMimeType: file.type,
      sourceSizeBytes: file.size,
      sourceStorageKey: key,
      requestedLanguage: language,
      separateVocals,
    })
    const updated = await repo.markUploaded(project.id, ownerId, { durationMs })

    const response = ok({ project: updated }, { status: 201 })
    if (isNew) {
      response.cookies.set(OWNER_COOKIE, ownerId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      })
    }
    return response
  } catch (err) {
    return handleError(err)
  }
}
