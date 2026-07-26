/** Zod schemas cho module Quản lý công trình — validate ở biên route handler. */
import { z } from "zod"

export const CONSTRUCTION_STATUSES = ["PLANNING", "IN_PROGRESS", "PAUSED", "COMPLETED"] as const
export const MILESTONE_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "DONE", "DELAYED"] as const
export const FILE_KINDS = ["PLAN", "BUDGET", "OTHER"] as const

/** Ngày dạng ISO (yyyy-mm-dd hoặc full ISO) hoặc null. */
const dateInput = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Ngày không hợp lệ." })
  .nullable()
  .optional()

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  startDate: dateInput,
  targetDate: dateInput,
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(CONSTRUCTION_STATUSES).optional(),
  startDate: dateInput,
  targetDate: dateInput,
})
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

/** Metadata gửi kèm multipart khi đăng nhật ký (ảnh là các field file riêng). */
export const createUpdateMetaSchema = z.object({
  note: z.string().trim().min(1, "Chú thích không được để trống.").max(4000),
  authorName: z.string().trim().max(100).optional(),
  /** Caption theo thứ tự ảnh gửi lên. */
  captions: z.array(z.string().max(500)).max(10).optional(),
})
export type CreateUpdateMeta = z.infer<typeof createUpdateMetaSchema>

export const milestoneRowSchema = z.object({
  /** id có sẵn = cập nhật; thiếu id = tạo mới. */
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  plannedStart: dateInput,
  plannedEnd: dateInput,
  status: z.enum(MILESTONE_STATUSES),
  percent: z.number().int().min(0).max(100),
  note: z.string().max(1000).nullable().optional(),
})
export const bulkMilestonesSchema = z.object({
  milestones: z.array(milestoneRowSchema).max(200),
})
export type BulkMilestonesInput = z.infer<typeof bulkMilestonesSchema>

export const costRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  estimatedVnd: z.number().int().min(0).max(1_000_000_000_000_000), // 1 triệu tỷ
  actualVnd: z.number().int().min(0).max(1_000_000_000_000_000),
  note: z.string().max(1000).nullable().optional(),
})
export const bulkCostsSchema = z.object({
  costItems: z.array(costRowSchema).max(500),
})
export type BulkCostsInput = z.infer<typeof bulkCostsSchema>

export const authSchema = z.object({
  code: z.string().min(4, "Mã tối thiểu 4 ký tự.").max(100),
})

/** Giới hạn upload ảnh nhật ký. */
export const MAX_PHOTOS_PER_UPDATE = 10
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB/ảnh (client đã nén trước)
export const MAX_DOC_BYTES = 25 * 1024 * 1024 // 25MB tài liệu

/**
 * MIME ảnh client được phép khai khi xin presigned URL. Đây CHỈ là khai báo để
 * ký URL — bytes thật vẫn được xác minh bằng magic bytes sau khi upload xong.
 */
export const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const

/**
 * Xin vé upload trực tiếp lên storage (bỏ qua giới hạn body 4.5MB của serverless).
 * Client chỉ khai tên/kiểu/kích thước — KEY LUÔN DO SERVER SINH.
 */
export const uploadTicketRequestSchema = z.object({
  target: z.enum(["photo", "doc"]),
  items: z
    .array(
      z.object({
        filename: z.string().trim().min(1).max(255),
        contentType: z.string().trim().min(1).max(120),
        sizeBytes: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(MAX_PHOTOS_PER_UPDATE),
})
export type UploadTicketRequest = z.infer<typeof uploadTicketRequestSchema>

/** Đăng nhật ký khi ảnh đã được PUT thẳng lên storage (body JSON, không multipart). */
export const createUpdateJsonSchema = z.object({
  note: z.string().trim().min(1, "Chú thích không được để trống.").max(4000),
  authorName: z.string().trim().max(100).optional(),
  photos: z
    .array(
      z.object({
        storageKey: z.string().trim().min(1).max(400),
        caption: z.string().max(500).optional(),
      }),
    )
    .max(MAX_PHOTOS_PER_UPDATE)
    .optional(),
})

/** Đính kèm tài liệu khi file đã được PUT thẳng lên storage. */
export const attachFileJsonSchema = z.object({
  storageKey: z.string().trim().min(1).max(400),
  filename: z.string().trim().min(1).max(200),
  kind: z.enum(FILE_KINDS),
})
