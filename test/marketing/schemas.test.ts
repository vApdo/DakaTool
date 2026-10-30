import { describe, expect, it } from "vitest"
import { postInputSchema } from "@/lib/marketing/schemas"

const KEY = "marketing/media/0b7f2c1e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.jpg"

const base = {
  fbPageId: "123",
  message: "Khai trương chi nhánh mới",
  link: "",
  scheduledAt: null,
  authorName: "Mai",
  media: [],
}

describe("schema bài viết", () => {
  it("chuẩn hoá link rỗng thành null", () => {
    expect(postInputSchema.parse(base).link).toBeNull()
  })

  it("từ chối bài không có nội dung, link lẫn ảnh", () => {
    expect(() => postInputSchema.parse({ ...base, message: "   " })).toThrow(/nội dung, link hoặc ảnh/)
  })

  it("nhận bài chỉ có ảnh", () => {
    const parsed = postInputSchema.parse({
      ...base,
      message: "",
      media: [{ key: KEY, contentType: "image/jpeg", sizeBytes: 1000 }],
    })
    expect(parsed.media).toHaveLength(1)
  })

  it("chặn key ảnh do client tự bịa", () => {
    const bad = { key: "projects/../../etc/passwd", contentType: "image/jpeg", sizeBytes: 10 }
    expect(() => postInputSchema.parse({ ...base, media: [bad] })).toThrow(/Ảnh không hợp lệ/)
  })

  it("giới hạn 10 ảnh và 8 MB mỗi ảnh", () => {
    const photo = { key: KEY, contentType: "image/jpeg", sizeBytes: 1000 }
    expect(() => postInputSchema.parse({ ...base, media: Array(11).fill(photo) })).toThrow(/Tối đa 10 ảnh/)
    expect(() => postInputSchema.parse({ ...base, media: [{ ...photo, sizeBytes: 9 * 1024 * 1024 }] })).toThrow(/8 MB/)
  })

  it("chỉ nhận link http(s) đầy đủ", () => {
    expect(() => postInputSchema.parse({ ...base, link: "asiagroup.vn" })).toThrow(/https/)
    expect(postInputSchema.parse({ ...base, link: "https://asiagroup.vn" }).link).toBe("https://asiagroup.vn")
  })
})
