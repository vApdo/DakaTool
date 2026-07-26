import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"
import { photoStorageKey, docStorageKey } from "@/lib/construction/media"
import { verifyUploadedDoc, verifyUploadedPhoto } from "@/lib/construction/verify-upload"
import type { StorageProvider } from "@/lib/storage"

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)])
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
])

/** Storage giả lập: map key → bytes. Chỉ hiện thực phần verify-upload cần đến. */
function fakeStorage(objects: Record<string, Buffer>): StorageProvider {
  return {
    driver: "s3",
    async putObject({ key }) {
      return { key }
    },
    async getObjectStream(key) {
      const buf = objects[key]
      if (!buf) throw new Error("not found")
      return Readable.from([buf])
    },
    async objectExists(key) {
      return key in objects
    },
    async statObject(key) {
      return key in objects ? { sizeBytes: objects[key].length } : null
    },
    async deleteObject(key) {
      delete objects[key]
    },
  }
}

describe("verifyUploadedPhoto — kiểm lại sau khi client PUT thẳng lên S3", () => {
  it("chấp nhận ảnh hợp lệ đúng công trình", async () => {
    const key = photoStorageKey("p1", "jpeg")
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: JPEG }), "p1", key, 10_000)
    expect(res).toEqual({ ok: true, value: "jpeg" })
  })

  it("từ chối key thuộc công trình khác", async () => {
    const key = photoStorageKey("p2", "jpeg")
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: JPEG }), "p1", key, 10_000)
    expect(res).toMatchObject({ ok: false, code: "INVALID_KEY" })
  })

  it("từ chối key lồng thêm thư mục (chống lách prefix)", async () => {
    const key = "construction/p1/photos/sub/evil.jpg"
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: JPEG }), "p1", key, 10_000)
    expect(res).toMatchObject({ ok: false, code: "INVALID_KEY" })
  })

  it("từ chối khi object chưa tồn tại", async () => {
    const key = photoStorageKey("p1", "jpeg")
    const res = await verifyUploadedPhoto(fakeStorage({}), "p1", key, 10_000)
    expect(res).toMatchObject({ ok: false, code: "UPLOAD_NOT_FOUND" })
  })

  it("từ chối file vượt hạn mức — presigned URL không tự chặn được size", async () => {
    const key = photoStorageKey("p1", "jpeg")
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: JPEG }), "p1", key, 8)
    expect(res).toMatchObject({ ok: false, code: "PHOTO_TOO_LARGE" })
  })

  it("từ chối file không phải ảnh dù đã lên storage", async () => {
    const key = photoStorageKey("p1", "jpeg")
    const notImage = Buffer.from("%PDF-1.7 giả dạng ảnh để lách")
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: notImage }), "p1", key, 10_000)
    expect(res).toMatchObject({ ok: false, code: "INVALID_IMAGE" })
  })

  it("từ chối khi bytes thật không khớp đuôi đã ký (PNG nằm trong key .jpg)", async () => {
    const key = photoStorageKey("p1", "jpeg")
    const res = await verifyUploadedPhoto(fakeStorage({ [key]: PNG }), "p1", key, 10_000)
    expect(res).toMatchObject({ ok: false, code: "INVALID_IMAGE" })
  })
})

describe("verifyUploadedDoc", () => {
  it("chấp nhận tài liệu hợp lệ và trả đúng kích thước", async () => {
    const key = docStorageKey("p1", "du-toan.xlsx")
    const body = Buffer.alloc(1234)
    const res = await verifyUploadedDoc(
      fakeStorage({ [key]: body }),
      "p1",
      key,
      "du-toan.xlsx",
      10_000,
    )
    expect(res).toEqual({ ok: true, value: 1234 })
  })

  it("từ chối khi tên file đổi đuôi so với lúc xin upload", async () => {
    const key = docStorageKey("p1", "du-toan.xlsx")
    const res = await verifyUploadedDoc(
      fakeStorage({ [key]: Buffer.alloc(10) }),
      "p1",
      key,
      "du-toan.exe",
      10_000,
    )
    expect(res).toMatchObject({ ok: false, code: "INVALID_FILE" })
  })

  it("từ chối key thuộc công trình khác", async () => {
    const key = docStorageKey("p2", "a.pdf")
    const res = await verifyUploadedDoc(fakeStorage({ [key]: Buffer.alloc(10) }), "p1", key, "a.pdf", 10_000)
    expect(res).toMatchObject({ ok: false, code: "INVALID_KEY" })
  })

  it("từ chối tài liệu vượt hạn mức", async () => {
    const key = docStorageKey("p1", "a.pdf")
    const res = await verifyUploadedDoc(fakeStorage({ [key]: Buffer.alloc(100) }), "p1", key, "a.pdf", 50)
    expect(res).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" })
  })
})
