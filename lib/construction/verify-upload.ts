/**
 * Xác minh object mà client đã PUT THẲNG lên storage bằng presigned URL.
 *
 * Khi upload đi thẳng lên S3/R2, server không nhìn thấy bytes lúc truyền — nên mọi
 * đảm bảo an toàn của luồng multipart cũ phải được kiểm lại ở đây TRƯỚC khi ghi DB:
 *   - key phải nằm đúng trong prefix của công trình (client gửi key về, không tin được),
 *   - object phải tồn tại và không vượt hạn mức (URL đã ký KHÔNG chặn được kích thước),
 *   - ảnh phải đúng JPEG/PNG/WebP theo MAGIC BYTES và khớp đuôi đã ký trong key.
 */
import type { StorageProvider } from "@/lib/storage"
import {
  docKeyPrefix,
  extForImageKind,
  photoKeyPrefix,
  sniffImage,
  type ImageKind,
} from "./media"

export type VerifyResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

/**
 * Đọc tối đa `bytes` byte đầu của object rồi đóng stream ngay — chỉ cần vài byte
 * để nhận diện định dạng, không tải cả file về server.
 */
export async function readObjectHead(
  storage: StorageProvider,
  key: string,
  bytes: number,
): Promise<Buffer> {
  const stream = await storage.getObjectStream(key)
  const chunks: Buffer[] = []
  let total = 0
  try {
    for await (const chunk of stream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buf)
      total += buf.length
      if (total >= bytes) break
    }
  } finally {
    stream.destroy()
  }
  return Buffer.concat(chunks).subarray(0, bytes)
}

/** Key phải nằm ngay trong prefix của công trình, không lồng thêm thư mục. */
function keyBelongsTo(key: string, prefix: string): boolean {
  if (!key.startsWith(prefix)) return false
  const rest = key.slice(prefix.length)
  return rest.length > 0 && !rest.includes("/")
}

export async function verifyUploadedPhoto(
  storage: StorageProvider,
  projectId: string,
  key: string,
  maxBytes: number,
): Promise<VerifyResult<ImageKind>> {
  if (!keyBelongsTo(key, photoKeyPrefix(projectId))) {
    return { ok: false, code: "INVALID_KEY", message: "Key ảnh không thuộc công trình này." }
  }

  const info = await storage.statObject(key)
  if (!info) {
    return { ok: false, code: "UPLOAD_NOT_FOUND", message: "Ảnh chưa được tải lên xong." }
  }
  if (info.sizeBytes > maxBytes) {
    return { ok: false, code: "PHOTO_TOO_LARGE", message: "Ảnh vượt 10MB." }
  }

  const kind = sniffImage(await readObjectHead(storage, key, 12))
  if (!kind) {
    return { ok: false, code: "INVALID_IMAGE", message: "File tải lên không phải ảnh JPEG/PNG/WebP." }
  }
  // Bytes thật phải khớp đuôi đã ký trong key, nếu không thì route stream ảnh sẽ
  // trả sai Content-Type.
  if (!key.endsWith(`.${extForImageKind(kind)}`)) {
    return { ok: false, code: "INVALID_IMAGE", message: "Định dạng ảnh không khớp với lúc xin upload." }
  }

  return { ok: true, value: kind }
}

export async function verifyUploadedDoc(
  storage: StorageProvider,
  projectId: string,
  key: string,
  filename: string,
  maxBytes: number,
): Promise<VerifyResult<number>> {
  if (!keyBelongsTo(key, docKeyPrefix(projectId))) {
    return { ok: false, code: "INVALID_KEY", message: "Key tài liệu không thuộc công trình này." }
  }

  const dot = filename.lastIndexOf(".")
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : ""
  if (!ext || !key.endsWith(ext)) {
    return { ok: false, code: "INVALID_FILE", message: "Tên tài liệu không khớp với lúc xin upload." }
  }

  const info = await storage.statObject(key)
  if (!info) {
    return { ok: false, code: "UPLOAD_NOT_FOUND", message: "Tài liệu chưa được tải lên xong." }
  }
  if (info.sizeBytes > maxBytes) {
    return { ok: false, code: "FILE_TOO_LARGE", message: "Tài liệu vượt 25MB." }
  }

  return { ok: true, value: info.sizeBytes }
}
