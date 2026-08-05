/**
 * Truy cập dữ liệu module công trình. Route handler chỉ gọi qua đây, không dùng
 * Prisma trực tiếp. Quyền GHI đã được chặn ở route bằng requireManager (access.ts).
 */
import { prisma } from "@/lib/prisma"
import { AccessError, ConflictError } from "@/lib/http"
import { getStorage } from "@/lib/storage"
import {
  toProjectDTO,
  toProjectDetailDTO,
  toUpdateDTO,
} from "./mappers"
import type {
  BulkCostsInput,
  BulkMilestonesInput,
  CreateProjectInput,
  UpdateProjectInput,
} from "./schemas"
import type { ConstructionProjectDTO, ConstructionProjectDetailDTO, UpdateDTO } from "./types"

const toDate = (v: string | null | undefined): Date | null | undefined =>
  v === undefined ? undefined : v === null ? null : new Date(v)

export async function listProjects(): Promise<ConstructionProjectDTO[]> {
  const projects = await prisma.constructionProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      milestones: { select: { percent: true } },
      costItems: { select: { estimatedVnd: true, actualVnd: true } },
      // Ảnh bìa = ảnh đầu của cập nhật MỚI NHẤT CÓ ẢNH (bỏ qua cập nhật chỉ có chữ,
      // nếu không thẻ công trình sẽ mất ảnh bìa khi đăng một ghi chú không kèm ảnh).
      updates: {
        where: { photos: { some: {} } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
      _count: { select: { updates: true } },
    },
  })
  return projects.map((p) =>
    toProjectDTO(p, p.updates[0]?.photos[0]?.id ?? null, p._count.updates),
  )
}

/** Ném not_found nếu công trình không tồn tại — gọi TRƯỚC khi ghi file vào storage. */
export async function assertProjectExists(projectId: string): Promise<void> {
  const exists = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")
}

export async function getProjectDetail(id: string): Promise<ConstructionProjectDetailDTO> {
  const project = await prisma.constructionProject.findUnique({
    where: { id },
    include: {
      updates: {
        orderBy: { createdAt: "desc" },
        include: { photos: { orderBy: { sortOrder: "asc" } } },
      },
      milestones: true,
      costItems: true,
      files: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!project) throw new AccessError("Công trình không tồn tại.", "not_found")
  return toProjectDetailDTO(project)
}

export async function createProject(input: CreateProjectInput): Promise<{ id: string }> {
  const p = await prisma.constructionProject.create({
    data: {
      name: input.name,
      description: input.description,
      startDate: toDate(input.startDate) ?? undefined,
      targetDate: toDate(input.targetDate) ?? undefined,
    },
  })
  return { id: p.id }
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<void> {
  const exists = await prisma.constructionProject.findUnique({ where: { id }, select: { id: true } })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")
  await prisma.constructionProject.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: toDate(input.startDate),
      targetDate: toDate(input.targetDate),
    },
  })
}

/** Tạo nhật ký + ảnh (storageKey do route đã lưu vào storage trước). */
export async function createUpdate(
  projectId: string,
  input: {
    note: string
    authorName?: string
    milestoneUpdate?: {
      id: string
      percent: number
      status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "DELAYED"
      note?: string
    }
    photos: Array<{ storageKey: string; caption?: string }>
  },
): Promise<UpdateDTO> {
  const exists = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")

  const update = await prisma.$transaction(async (tx) => {
    if (input.milestoneUpdate) {
      const result = await tx.constructionMilestone.updateMany({
        where: { id: input.milestoneUpdate.id, projectId },
        data: {
          percent: input.milestoneUpdate.percent,
          status: input.milestoneUpdate.status,
          note: input.milestoneUpdate.note ?? input.note,
        },
      })
      if (result.count !== 1) {
        throw new AccessError("Hạng mục không còn tồn tại. Vui lòng tải lại trang.", "not_found")
      }
    }

    return tx.constructionUpdate.create({
      data: {
        projectId,
        note: input.note,
        authorName: input.authorName,
        photos: {
          create: input.photos.map((p, i) => ({
            storageKey: p.storageKey,
            caption: p.caption,
            sortOrder: i,
          })),
        },
      },
      include: { photos: { orderBy: { sortOrder: "asc" } } },
    })
  })
  return toUpdateDTO(update)
}

/** Xóa nhật ký + dọn ảnh trong storage. */
export async function deleteUpdate(updateId: string): Promise<void> {
  const update = await prisma.constructionUpdate.findUnique({
    where: { id: updateId },
    include: { photos: true },
  })
  if (!update) throw new AccessError("Nhật ký không tồn tại.", "not_found")

  const storage = getStorage()
  await prisma.constructionUpdate.delete({ where: { id: updateId } })
  // Dọn file sau khi DB xóa thành công (lỗi dọn file không chặn nghiệp vụ).
  await Promise.allSettled(update.photos.map((p) => storage.deleteObject(p.storageKey)))
}

export async function getPhotoForStream(photoId: string) {
  const photo = await prisma.constructionPhoto.findUnique({ where: { id: photoId } })
  if (!photo) throw new AccessError("Ảnh không tồn tại.", "not_found")
  return photo
}

/**
 * Kiểm tra mọi id gửi lên đều còn tồn tại VÀ thuộc đúng công trình này.
 *
 * Không có bước này, `prisma.update({ where: { id } })` sẽ:
 *  - ghi đè dòng của công trình khác nếu id lạ (chỉ lọc theo id), và
 *  - ném P2025 → HTTP 500 nếu dòng vừa bị người khác xoá.
 * Cả hai đều dẫn tới mất dữ liệu, nên chặn trước và báo lỗi rõ ràng.
 */
async function assertRowsBelong(
  table: "milestone" | "cost",
  projectId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  const found =
    table === "milestone"
      ? await prisma.constructionMilestone.findMany({
          where: { id: { in: ids }, projectId },
          select: { id: true },
        })
      : await prisma.constructionCostItem.findMany({
          where: { id: { in: ids }, projectId },
          select: { id: true },
        })
  if (found.length !== ids.length) {
    throw new ConflictError(
      "Dữ liệu đã thay đổi (có dòng không còn tồn tại hoặc không thuộc công trình này). Vui lòng tải lại trang rồi nhập lại.",
    )
  }
}

/** Bulk upsert hạng mục: giữ các id gửi lên, xóa id vắng mặt, tạo dòng không id. */
export async function saveMilestones(
  projectId: string,
  input: BulkMilestonesInput,
): Promise<void> {
  const exists = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")

  const keepIds = input.milestones.filter((m) => m.id).map((m) => m.id as string)
  await assertRowsBelong("milestone", projectId, keepIds)
  await prisma.$transaction([
    prisma.constructionMilestone.deleteMany({
      where: { projectId, id: { notIn: keepIds } },
    }),
    ...input.milestones.map((m, i) =>
      m.id
        ? prisma.constructionMilestone.update({
            where: { id: m.id },
            data: {
              name: m.name,
              plannedStart: toDate(m.plannedStart),
              plannedEnd: toDate(m.plannedEnd),
              status: m.status,
              percent: m.percent,
              note: m.note ?? null,
              sortOrder: i,
            },
          })
        : prisma.constructionMilestone.create({
            data: {
              projectId,
              name: m.name,
              plannedStart: toDate(m.plannedStart) ?? undefined,
              plannedEnd: toDate(m.plannedEnd) ?? undefined,
              status: m.status,
              percent: m.percent,
              note: m.note ?? null,
              sortOrder: i,
            },
          }),
    ),
  ])
}

export async function saveCostItems(projectId: string, input: BulkCostsInput): Promise<void> {
  const exists = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")

  const keepIds = input.costItems.filter((c) => c.id).map((c) => c.id as string)
  await assertRowsBelong("cost", projectId, keepIds)
  await prisma.$transaction([
    prisma.constructionCostItem.deleteMany({ where: { projectId, id: { notIn: keepIds } } }),
    ...input.costItems.map((c, i) =>
      c.id
        ? prisma.constructionCostItem.update({
            where: { id: c.id },
            data: {
              name: c.name,
              estimatedVnd: BigInt(c.estimatedVnd),
              actualVnd: BigInt(c.actualVnd),
              note: c.note ?? null,
              sortOrder: i,
            },
          })
        : prisma.constructionCostItem.create({
            data: {
              projectId,
              name: c.name,
              estimatedVnd: BigInt(c.estimatedVnd),
              actualVnd: BigInt(c.actualVnd),
              note: c.note ?? null,
              sortOrder: i,
            },
          }),
    ),
  ])
}

export async function createFile(
  projectId: string,
  data: { kind: "PLAN" | "BUDGET" | "OTHER"; filename: string; storageKey: string; sizeBytes: number },
): Promise<{ id: string }> {
  const exists = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!exists) throw new AccessError("Công trình không tồn tại.", "not_found")
  const f = await prisma.constructionFile.create({
    data: { projectId, ...data, sizeBytes: BigInt(data.sizeBytes) },
  })
  return { id: f.id }
}

export async function getFileForDownload(fileId: string) {
  const file = await prisma.constructionFile.findUnique({ where: { id: fileId } })
  if (!file) throw new AccessError("Tài liệu không tồn tại.", "not_found")
  return file
}
