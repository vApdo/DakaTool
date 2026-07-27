/**
 * Tiện ích media phía server cho module công trình:
 * - Sinh storage key (server sinh, không nhận key thô từ client).
 * - Nhận diện định dạng ảnh bằng MAGIC BYTES (không tin MIME/đuôi client).
 */
import { randomUUID } from "node:crypto"

export type ImageKind = "jpeg" | "png" | "webp"

export function sniffImage(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg"
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png"
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp"
  return null
}

export const IMAGE_MIME: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

function safeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, "_").slice(0, 80) || "x"
}

/** Đuôi file tương ứng định dạng ảnh — key luôn mang đúng đuôi của bytes thật. */
export function extForImageKind(kind: ImageKind): string {
  return kind === "jpeg" ? "jpg" : kind
}

/**
 * Prefix key của một công trình. Dùng để chặn client khai một key thuộc công
 * trình khác khi upload trực tiếp lên S3 (client tự gửi key về sau khi PUT).
 */
export function photoKeyPrefix(projectId: string): string {
  return `construction/${safeSegment(projectId)}/photos/`
}

export function docKeyPrefix(projectId: string): string {
  return `construction/${safeSegment(projectId)}/docs/`
}

export function photoStorageKey(projectId: string, kind: ImageKind): string {
  return `${photoKeyPrefix(projectId)}${randomUUID()}.${extForImageKind(kind)}`
}

export function docStorageKey(projectId: string, filename: string): string {
  const dot = filename.lastIndexOf(".")
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : ""
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ""
  return `${docKeyPrefix(projectId)}${randomUUID()}${safeExt}`
}

/** MIME cho tài liệu đính kèm được phép. */
export const ALLOWED_DOC_EXT = [".pdf", ".xls", ".xlsx", ".doc", ".docx", ".csv"] as const
export function docExtAllowed(filename: string): boolean {
  const dot = filename.lastIndexOf(".")
  if (dot < 0) return false
  return (ALLOWED_DOC_EXT as readonly string[]).includes(filename.slice(dot).toLowerCase())
}
