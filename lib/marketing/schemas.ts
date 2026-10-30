import { z } from "zod"
import { MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_TYPES, isMediaKey } from "./media"

const photoType = z.enum(Object.keys(PHOTO_TYPES) as [keyof typeof PHOTO_TYPES, ...(keyof typeof PHOTO_TYPES)[]], {
  error: "Chỉ nhận ảnh JPG, PNG hoặc GIF.",
})

export const mediaInputSchema = z.object({
  key: z.string().refine(isMediaKey, "Ảnh không hợp lệ, hãy tải lại ảnh."),
  contentType: photoType,
  sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES, "Mỗi ảnh tối đa 8 MB."),
})

const optionalLink = z
  .union([z.literal(""), z.url({ error: "Link phải là địa chỉ web đầy đủ, vd. https://..." })])
  .optional()
  .transform((value) => (value ? value : null))

export const postInputSchema = z
  .object({
    fbPageId: z.string().trim().min(1, "Chọn Fanpage để đăng."),
    message: z.string().trim().max(10_000, "Nội dung tối đa 10.000 ký tự."),
    link: optionalLink,
    scheduledAt: z.iso.datetime({ offset: true, error: "Giờ hẹn không hợp lệ." }).nullable(),
    authorName: z.string().trim().min(1, "Nhập tên người đăng.").max(100),
    media: z.array(mediaInputSchema).max(MAX_PHOTOS, `Tối đa ${MAX_PHOTOS} ảnh mỗi bài.`),
  })
  .refine((post) => post.message.length > 0 || post.media.length > 0 || post.link !== null, {
    error: "Bài viết cần có nội dung, link hoặc ảnh.",
  })

export const uploadRequestSchema = z.object({
  contentType: photoType,
  sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES, "Mỗi ảnh tối đa 8 MB."),
})

export const listQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
})

export type PostInput = z.infer<typeof postInputSchema>
