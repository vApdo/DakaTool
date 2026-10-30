import { z } from "zod"
import { MAX_PHOTOS, MEDIA_TYPES, isMediaKey, isVideoContentType, maxBytesFor, sizeLimitMessage } from "./media"

const mediaType = z.enum(Object.keys(MEDIA_TYPES) as [keyof typeof MEDIA_TYPES, ...(keyof typeof MEDIA_TYPES)[]], {
  error: "Chỉ nhận ảnh JPG, PNG, GIF hoặc video MP4, MOV.",
})

const sizedFile = z
  .object({ contentType: mediaType, sizeBytes: z.number().int().positive("File rỗng, hãy chọn lại.") })
  .refine((file) => file.sizeBytes <= maxBytesFor(file.contentType), {
    error: (issue) => sizeLimitMessage((issue.input as { contentType: string }).contentType),
  })

export const mediaInputSchema = z
  .object({
    key: z.string().refine(isMediaKey, "File không hợp lệ, hãy tải lại."),
    contentType: mediaType,
    sizeBytes: z.number().int().positive("File rỗng, hãy chọn lại."),
  })
  .refine((file) => file.sizeBytes <= maxBytesFor(file.contentType), {
    error: (issue) => sizeLimitMessage((issue.input as { contentType: string }).contentType),
  })

export const postInputSchema = z
  .object({
    fbPageId: z.string().trim().min(1, "Chọn Fanpage để đăng."),
    message: z.string().trim().max(10_000, "Nội dung tối đa 10.000 ký tự."),
    scheduledAt: z.iso.datetime({ offset: true, error: "Giờ hẹn không hợp lệ." }).nullable(),
    authorName: z.string().trim().min(1, "Nhập tên người đăng.").max(100),
    media: z.array(mediaInputSchema).max(MAX_PHOTOS, `Tối đa ${MAX_PHOTOS} ảnh mỗi bài.`),
  })
  .refine((post) => post.message.length > 0 || post.media.length > 0, {
    error: "Bài viết cần có nội dung, ảnh hoặc video.",
  })
  .refine((post) => !post.media.some((m) => isVideoContentType(m.contentType)) || post.media.length === 1, {
    error: "Bài có video chỉ được kèm đúng 1 video, không kèm ảnh.",
  })

export const uploadRequestSchema = sizedFile

export const listQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
})

export type PostInput = z.infer<typeof postInputSchema>
