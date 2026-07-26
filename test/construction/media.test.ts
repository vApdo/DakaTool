import { describe, expect, it } from "vitest"
import {
  docExtAllowed,
  docStorageKey,
  photoStorageKey,
  sniffImage,
} from "@/lib/construction/media"

describe("sniffImage (magic bytes, không tin MIME client)", () => {
  it("nhận diện JPEG", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg")
  })
  it("nhận diện PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(sniffImage(png)).toBe("png")
  })
  it("nhận diện WebP", () => {
    const webp = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ])
    expect(sniffImage(webp)).toBe("webp")
  })
  it("từ chối file không phải ảnh (vd PDF đổi đuôi)", () => {
    expect(sniffImage(Buffer.from("%PDF-1.7 fake image data"))).toBeNull()
  })
  it("từ chối buffer quá ngắn", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8]))).toBeNull()
  })
})

describe("storage key do server sinh", () => {
  it("nằm dưới namespace construction/<project>/", () => {
    const key = photoStorageKey("abc123", "jpeg")
    expect(key).toMatch(/^construction\/abc123\/photos\/[a-f0-9-]+\.jpg$/)
  })
  it("chống path traversal từ projectId", () => {
    const key = photoStorageKey("../../etc", "png")
    expect(key).not.toContain("..")
    expect(key.startsWith("construction/")).toBe(true)
  })
  it("giữ đuôi tài liệu an toàn, bỏ tên client", () => {
    const key = docStorageKey("p1", "../../../du-toan.xlsx")
    expect(key).not.toContain("..")
    expect(key.endsWith(".xlsx")).toBe(true)
  })
})

describe("docExtAllowed", () => {
  it("cho phép pdf/excel/word/csv", () => {
    for (const f of ["a.pdf", "b.xlsx", "c.XLS", "d.docx", "e.csv"]) {
      expect(docExtAllowed(f)).toBe(true)
    }
  })
  it("chặn file thực thi", () => {
    for (const f of ["x.exe", "y.sh", "z", "a.js"]) {
      expect(docExtAllowed(f)).toBe(false)
    }
  })
})
