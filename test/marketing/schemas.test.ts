import { describe, expect, it } from "vitest"
import { postInputSchema, uploadRequestSchema } from "@/lib/marketing/schemas"

const KEY = "marketing/media/0b7f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.jpg"
const VIDEO_KEY = "marketing/media/0b7f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.mp4"
const photo = { key: KEY, contentType: "image/jpeg", sizeBytes: 1000 }
const video = { key: VIDEO_KEY, contentType: "video/mp4", sizeBytes: 200 * 1024 * 1024 }

const base = {
  fbPageId: "123",
  message: "Khai trương chi nhánh mới",
  scheduledAt: null,
  authorName: "Mai",
  media: [],
}

describe("schema bài viết", () => {
  it("từ chối bài không có nội dung, ảnh lẫn video", () => {
    expect(() => postInputSchema.parse({ ...base, message: "   " })).toThrow(/nội dung, ảnh hoặc video/)
  })

  it("nhận bài chỉ có ảnh", () => {
    expect(postInputSchema.parse({ ...base, message: "", media: [photo] }).media).toHaveLength(1)
  })

  it("chặn key do client tự bịa", () => {
    const bad = { key: "projects/../../etc/passwd", contentType: "image/jpeg", sizeBytes: 10 }
    expect(() => postInputSchema.parse({ ...base, media: [bad] })).toThrow(/không hợp lệ/)
  })

  it("giới hạn 10 ảnh và 8 MB mỗi ảnh", () => {
    expect(() => postInputSchema.parse({ ...base, media: Array(11).fill(photo) })).toThrow(/Tối đa 10 ảnh/)
    expect(() => postInputSchema.parse({ ...base, media: [{ ...photo, sizeBytes: 9 * 1024 * 1024 }] })).toThrow(/8 MB/)
  })

  it("nhận 1 video tới 1 GB", () => {
    expect(postInputSchema.parse({ ...base, media: [video] }).media).toHaveLength(1)
    expect(() => postInputSchema.parse({ ...base, media: [{ ...video, sizeBytes: 1025 * 1024 * 1024 }] })).toThrow(/1 GB/)
  })

  it("không cho trộn video với ảnh hoặc đăng 2 video", () => {
    expect(() => postInputSchema.parse({ ...base, media: [video, photo] })).toThrow(/đúng 1 video/)
    expect(() => postInputSchema.parse({ ...base, media: [video, video] })).toThrow(/đúng 1 video/)
  })

  it("xin chỗ tải lên kiểm tra định dạng và dung lượng theo loại file", () => {
    expect(uploadRequestSchema.parse({ contentType: "video/quicktime", sizeBytes: 500 * 1024 * 1024 }).contentType).toBe("video/quicktime")
    expect(() => uploadRequestSchema.parse({ contentType: "image/png", sizeBytes: 20 * 1024 * 1024 })).toThrow(/8 MB/)
    expect(() => uploadRequestSchema.parse({ contentType: "video/avi", sizeBytes: 10 })).toThrow(/MP4, MOV/)
  })
})
