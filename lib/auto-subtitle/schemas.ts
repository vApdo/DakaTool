import { z } from "zod"
import {
  ALLOWED_VIDEO_MIME,
  MAX_SEGMENT_TEXT_LENGTH,
  MAX_VIDEO_SIZE_BYTES,
  SUPPORTED_LANGUAGES,
} from "./constants"

/**
 * Zod schema cho mọi input của Auto Subtitle API. Validate ở biên (route handler)
 * trước khi chạm DB/queue.
 */

export const languageSchema = z.enum(SUPPORTED_LANGUAGES)

export const subtitleStyleSchema = z.object({
  fontName: z.string().min(1).max(100),
  fontSize: z.number().int().min(8).max(200),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outlineColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outlineWidth: z.number().min(0).max(20),
  position: z.enum(["bottom", "middle", "top"]),
  marginV: z.number().int().min(0).max(500),
  backgroundEnabled: z.boolean(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundOpacity: z.number().min(0).max(1),
})

export const createProjectSchema = z.object({
  filename: z.string().min(1).max(400),
  mimeType: z.enum(ALLOWED_VIDEO_MIME),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_VIDEO_SIZE_BYTES, { message: "File vượt quá dung lượng cho phép." }),
  language: languageSchema.default("auto"),
  title: z.string().min(1).max(300).optional(),
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

/** Cập nhật một segment: chỉ startMs / endMs / text; endMs > startMs. */
export const updateSegmentSchema = z
  .object({
    startMs: z.number().int().min(0).optional(),
    endMs: z.number().int().min(0).optional(),
    text: z.string().max(MAX_SEGMENT_TEXT_LENGTH).optional(),
  })
  .refine((v) => v.startMs !== undefined || v.endMs !== undefined || v.text !== undefined, {
    message: "Phải cung cấp ít nhất một trường để cập nhật.",
  })
  .refine((v) => v.startMs === undefined || v.endMs === undefined || v.endMs > v.startMs, {
    message: "endMs phải lớn hơn startMs.",
    path: ["endMs"],
  })
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>

/** Cập nhật nhiều segment cùng lúc (lưu trong transaction). */
export const bulkUpdateSegmentsSchema = z.object({
  segments: z
    .array(
      z.object({
        id: z.string().min(1),
        startMs: z.number().int().min(0),
        endMs: z.number().int().min(0),
        text: z.string().max(MAX_SEGMENT_TEXT_LENGTH),
      }),
    )
    .min(1)
    .max(5000),
})
export type BulkUpdateSegmentsInput = z.infer<typeof bulkUpdateSegmentsSchema>

export const createExportSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SRT") }),
  z.object({ type: z.literal("VTT") }),
  z.object({ type: z.literal("ASS") }),
  z.object({ type: z.literal("BURNED_MP4"), style: subtitleStyleSchema.optional() }),
])
export type CreateExportInput = z.infer<typeof createExportSchema>
