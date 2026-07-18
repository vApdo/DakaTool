/**
 * Lớp truy cập dữ liệu cho Auto Subtitle. Route handler & worker chỉ gọi qua đây,
 * không truy vấn Prisma trực tiếp — để tập trung kiểm tra quyền, ràng buộc
 * "không tạo job trùng", và mapping DTO.
 */
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { DEFAULT_SUBTITLE_STYLE, truncateError } from "./constants"
import { toProjectDetailDTO, toProjectDTO } from "./mappers"
import type { ProjectDTO, ProjectDetailDTO, SubtitleStyle } from "./types"

/** Lỗi quyền truy cập — route handler map sang HTTP 403/404. */
export class AccessError extends Error {
  constructor(
    message: string,
    readonly kind: "not_found" | "forbidden",
  ) {
    super(message)
    this.name = "AccessError"
  }
}

/** Lỗi nghiệp vụ (ví dụ đang xử lý, không thể start lại). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}

/**
 * Kiểm tra quyền: ẩn danh (ownerId null) ai cũng vào được; nếu project có owner
 * thì requester phải khớp. Trả về project raw.
 */
async function loadOwned(projectId: string, ownerId: string | null) {
  const project = await prisma.subtitleProject.findUnique({ where: { id: projectId } })
  if (!project) throw new AccessError("Project không tồn tại.", "not_found")
  if (project.ownerId && project.ownerId !== ownerId) {
    // Không lộ sự tồn tại của project của người khác.
    throw new AccessError("Project không tồn tại.", "not_found")
  }
  return project
}

export async function createProject(input: {
  ownerId: string | null
  title: string
  sourceFilename: string
  sourceMimeType: string
  sourceSizeBytes: number
  sourceStorageKey: string
  requestedLanguage: string
}): Promise<ProjectDTO> {
  const project = await prisma.subtitleProject.create({
    data: {
      ownerId: input.ownerId,
      title: input.title,
      sourceFilename: input.sourceFilename,
      sourceMimeType: input.sourceMimeType,
      sourceSizeBytes: BigInt(input.sourceSizeBytes),
      sourceStorageKey: input.sourceStorageKey,
      requestedLanguage: input.requestedLanguage,
      status: "UPLOADING",
      subtitleStyle: DEFAULT_SUBTITLE_STYLE as unknown as Prisma.InputJsonValue,
    },
  })
  return toProjectDTO(project)
}

/** Đánh dấu upload xong (client đã đẩy file lên storage). */
export async function markUploaded(
  projectId: string,
  ownerId: string | null,
  meta: { durationMs?: number },
): Promise<ProjectDTO> {
  await loadOwned(projectId, ownerId)
  const project = await prisma.subtitleProject.update({
    where: { id: projectId },
    data: {
      status: "UPLOADED",
      durationMs: meta.durationMs,
    },
  })
  return toProjectDTO(project)
}

export async function getProjectDetail(
  projectId: string,
  ownerId: string | null,
): Promise<ProjectDetailDTO> {
  await loadOwned(projectId, ownerId)
  const project = await prisma.subtitleProject.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      segments: { orderBy: { order: "asc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      exports: { orderBy: { createdAt: "desc" } },
    },
  })
  return toProjectDetailDTO(project)
}

/** Dùng cho worker: lấy raw project (không kiểm quyền — worker tin cậy nội bộ). */
export async function getProjectRaw(projectId: string) {
  return prisma.subtitleProject.findUnique({ where: { id: projectId } })
}

/** Dùng cho worker: lấy segment (đã sắp xếp) để sinh file phụ đề. */
export async function getSegmentsForBuild(projectId: string) {
  return prisma.subtitleSegment.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { order: true, startMs: true, endMs: true, text: true },
  })
}

export async function completeExport(
  exportId: string,
  data: { storageKey: string; sizeBytes: number },
): Promise<void> {
  await prisma.subtitleExport.update({
    where: { id: exportId },
    data: {
      status: "COMPLETED",
      storageKey: data.storageKey,
      sizeBytes: BigInt(data.sizeBytes),
      completedAt: new Date(),
    },
  })
}

export async function failExport(exportId: string, message: string): Promise<void> {
  await prisma.subtitleExport.update({
    where: { id: exportId },
    data: { status: "FAILED", errorMessage: truncateError(message) },
  })
}

export async function setExportProcessing(exportId: string): Promise<void> {
  await prisma.subtitleExport.update({
    where: { id: exportId },
    data: { status: "PROCESSING" },
  })
}

/**
 * Tạo job transcribe cho project. Đảm bảo không có job transcribe đang chạy
 * (QUEUED/ACTIVE) — dùng transaction + kiểm tra trong DB để chống double-submit.
 * Trả về job DB (chưa có bullJobId) để caller enqueue rồi cập nhật.
 */
export async function createTranscribeJobIfNone(
  projectId: string,
  ownerId: string | null,
): Promise<{ jobId: string }> {
  await loadOwned(projectId, ownerId)

  return prisma.$transaction(async (tx) => {
    const project = await tx.subtitleProject.findUniqueOrThrow({ where: { id: projectId } })
    if (
      project.status !== "UPLOADED" &&
      project.status !== "FAILED" &&
      project.status !== "READY" &&
      project.status !== "COMPLETED"
    ) {
      throw new ConflictError("Project đang được xử lý, không thể bắt đầu lại.")
    }

    const active = await tx.subtitleJob.findFirst({
      where: {
        projectId,
        type: "TRANSCRIBE",
        status: { in: ["QUEUED", "ACTIVE"] },
      },
    })
    if (active) throw new ConflictError("Đã có tác vụ nhận dạng đang chạy cho project này.")

    const job = await tx.subtitleJob.create({
      data: { projectId, type: "TRANSCRIBE", status: "QUEUED" },
    })
    await tx.subtitleProject.update({
      where: { id: projectId },
      data: { status: "QUEUED", progress: 0, errorCode: null, errorMessage: null },
    })
    return { jobId: job.id }
  })
}

/** Tạo bản ghi job cho export/render (đã kiểm quyền ở createExport trước đó). */
export async function createExportJob(
  projectId: string,
  type: "RENDER_VIDEO" | "GENERATE_EXPORT",
): Promise<{ jobId: string }> {
  const job = await prisma.subtitleJob.create({
    data: { projectId, type, status: "QUEUED" },
  })
  return { jobId: job.id }
}

export async function attachBullJobId(jobId: string, bullJobId: string): Promise<void> {
  await prisma.subtitleJob.update({ where: { id: jobId }, data: { bullJobId } })
}

/** Cập nhật tiến độ project (worker gọi khi đọc progress từ Python/FFmpeg). */
export async function updateProjectProgress(
  projectId: string,
  data: {
    status?: Prisma.SubtitleProjectUpdateInput["status"]
    progress?: number
    durationMs?: number
    detectedLanguage?: string
  },
): Promise<void> {
  await prisma.subtitleProject.update({ where: { id: projectId }, data })
}

export async function updateJob(
  jobId: string,
  data: Prisma.SubtitleJobUpdateInput,
): Promise<void> {
  await prisma.subtitleJob.update({ where: { id: jobId }, data })
}

/** Ghi lỗi vào cả job và project. */
export async function failJobAndProject(
  jobId: string,
  projectId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const msg = truncateError(errorMessage)
  await prisma.$transaction([
    prisma.subtitleJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorCode, errorMessage: msg, completedAt: new Date() },
    }),
    prisma.subtitleProject.update({
      where: { id: projectId },
      data: { status: "FAILED", errorCode, errorMessage: msg },
    }),
  ])
}

/**
 * Thay toàn bộ segment của project bằng kết quả transcribe (chạy trong transaction:
 * xoá cũ, chèn mới). Dùng khi transcribe hoàn tất.
 */
export async function replaceSegments(
  projectId: string,
  segments: Array<{
    order: number
    startMs: number
    endMs: number
    text: string
    words?: unknown
  }>,
): Promise<void> {
  await prisma.$transaction([
    prisma.subtitleSegment.deleteMany({ where: { projectId } }),
    prisma.subtitleSegment.createMany({
      data: segments.map((s) => ({
        projectId,
        order: s.order,
        startMs: s.startMs,
        endMs: s.endMs,
        text: s.text,
        words:
          s.words === undefined
            ? Prisma.JsonNull
            : (s.words as Prisma.InputJsonValue),
      })),
    }),
  ])
}

export async function updateSegment(
  projectId: string,
  ownerId: string | null,
  segmentId: string,
  patch: { startMs?: number; endMs?: number; text?: string },
): Promise<void> {
  await loadOwned(projectId, ownerId)
  const segment = await prisma.subtitleSegment.findUnique({ where: { id: segmentId } })
  if (!segment || segment.projectId !== projectId) {
    throw new AccessError("Segment không tồn tại.", "not_found")
  }
  await prisma.subtitleSegment.update({ where: { id: segmentId }, data: patch })
}

export async function bulkUpdateSegments(
  projectId: string,
  ownerId: string | null,
  updates: Array<{ id: string; startMs: number; endMs: number; text: string }>,
): Promise<void> {
  await loadOwned(projectId, ownerId)
  const ids = updates.map((u) => u.id)
  const existing = await prisma.subtitleSegment.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true },
  })
  const owned = new Set(existing.map((e) => e.id))
  const invalid = ids.filter((id) => !owned.has(id))
  if (invalid.length > 0) {
    throw new AccessError("Có segment không thuộc project này.", "forbidden")
  }
  await prisma.$transaction(
    updates.map((u) =>
      prisma.subtitleSegment.update({
        where: { id: u.id },
        data: { startMs: u.startMs, endMs: u.endMs, text: u.text },
      }),
    ),
  )
}

export async function updateStyle(
  projectId: string,
  ownerId: string | null,
  style: SubtitleStyle,
): Promise<void> {
  await loadOwned(projectId, ownerId)
  await prisma.subtitleProject.update({
    where: { id: projectId },
    data: { subtitleStyle: style as unknown as Prisma.InputJsonValue },
  })
}

export async function createExport(
  projectId: string,
  ownerId: string | null,
  data: { type: "SRT" | "VTT" | "ASS" | "BURNED_MP4"; filename: string; mimeType: string },
): Promise<{ exportId: string }> {
  await loadOwned(projectId, ownerId)
  const record = await prisma.subtitleExport.create({
    data: {
      projectId,
      type: data.type,
      status: "PENDING",
      filename: data.filename,
      mimeType: data.mimeType,
    },
  })
  return { exportId: record.id }
}

export async function getExportForDownload(
  exportId: string,
  ownerId: string | null,
): Promise<{
  storageKey: string
  filename: string
  mimeType: string
}> {
  const record = await prisma.subtitleExport.findUnique({ where: { id: exportId } })
  if (!record) throw new AccessError("Export không tồn tại.", "not_found")
  await loadOwned(record.projectId, ownerId)
  if (record.status !== "COMPLETED" || !record.storageKey) {
    throw new ConflictError("Export chưa sẵn sàng để tải.")
  }
  return {
    storageKey: record.storageKey,
    filename: record.filename,
    mimeType: record.mimeType,
  }
}
