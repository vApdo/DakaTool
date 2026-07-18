/**
 * Storage abstraction cho Auto Subtitle.
 *
 * Mọi truy cập file (video nguồn, kết quả phụ đề, video đã ghép sub) đi qua
 * interface này — code nghiệp vụ không biết đang là đĩa cục bộ hay S3/R2/MinIO.
 * Key luôn do server sinh (xem buildStorageKey) — không bao giờ nhận key thô từ client.
 */
import { randomUUID } from "node:crypto"
import type { Readable } from "node:stream"

export interface PutObjectInput {
  /** Key nội bộ (server sinh), ví dụ "projects/<id>/source/video.mp4". */
  key: string
  body: Readable | Buffer
  contentType: string
  /** Kích thước (byte) nếu biết trước — cần cho một số backend S3. */
  contentLength?: number
}

export interface UploadUrl {
  /** URL client PUT trực tiếp (chỉ S3). */
  url: string
  method: "PUT"
  headers: Record<string, string>
  /** Key cuối cùng để lưu vào DB. */
  key: string
  expiresInSeconds: number
}

export interface StorageProvider {
  readonly driver: "local" | "s3"

  /** Ghi một object. Trả về key đã lưu. */
  putObject(input: PutObjectInput): Promise<{ key: string }>

  /** Đọc object dưới dạng stream (để trả file download / worker đọc). */
  getObjectStream(key: string): Promise<Readable>

  objectExists(key: string): Promise<boolean>

  deleteObject(key: string): Promise<void>

  /**
   * Đường dẫn cục bộ tuyệt đối tới object, nếu backend hỗ trợ (local).
   * Worker Node ưu tiên dùng path này để đưa cho FFmpeg/Python thay vì tải qua stream.
   * S3 trả undefined → worker phải tải về temp trước.
   */
  getLocalPath?(key: string): string | undefined

  /**
   * Tạo presigned upload URL (chỉ S3). Local trả undefined → client upload qua
   * route handler thường.
   */
  createUploadUrl?(input: {
    key: string
    contentType: string
    maxSizeBytes: number
  }): Promise<UploadUrl>

  /**
   * URL tải object cho người dùng cuối. Local có thể trả undefined → dùng route
   * handler stream. S3 trả presigned GET URL.
   */
  createDownloadUrl?(key: string, expiresInSeconds?: number): Promise<string | undefined>
}

/** Ký tự an toàn cho một segment key (không cho phép "/", "..", khoảng trắng lạ). */
function safeSegment(input: string): string {
  return (
    input
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.{2,}/g, "_") // triệt tiêu ".." tránh path traversal
      .slice(0, 80) || "x"
  )
}

/** Lấy đuôi file an toàn (giữ nguyên chữ thường, tối đa 10 ký tự). */
function safeExt(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot < 0) return ""
  const ext = filename.slice(dot).toLowerCase()
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ""
}

/**
 * Sinh key nội bộ cho một object. KHÔNG dùng tên/đường dẫn client cung cấp làm key
 * — chỉ dùng để lấy đuôi file. Ngăn path traversal ngay từ nguồn.
 */
export function buildStorageKey(parts: {
  projectId: string
  kind: "source" | "result" | "export" | "audio"
  filename?: string
  basename?: string
}): string {
  const project = safeSegment(parts.projectId)
  const ext = parts.filename ? safeExt(parts.filename) : ""
  const name = parts.basename ? safeSegment(parts.basename) : `${randomUUID()}${ext}`
  return `projects/${project}/${parts.kind}/${name}`
}
