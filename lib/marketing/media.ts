/**
 * Ảnh/video đính kèm bài viết: key do server sinh, chỉ nhận định dạng Facebook đăng được.
 * Một bài có 1–10 ảnh, hoặc đúng 1 video (Facebook không cho trộn ảnh và video trong một bài).
 */
import { randomUUID } from "node:crypto"

export const MAX_PHOTOS = 10
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
/** Giới hạn tải video một lần của Graph API. */
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024

export const PHOTO_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
} as const

export const VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
} as const

export const MEDIA_TYPES = { ...PHOTO_TYPES, ...VIDEO_TYPES } as const

export type MediaContentType = keyof typeof MEDIA_TYPES

const KEY_PATTERN = /^marketing\/media\/[0-9a-f-]{36}\.(jpg|png|gif|mp4|mov)$/

export function isMediaContentType(value: string): value is MediaContentType {
  return Object.prototype.hasOwnProperty.call(MEDIA_TYPES, value)
}

export function isVideoContentType(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(VIDEO_TYPES, value)
}

export function maxBytesFor(contentType: string): number {
  return isVideoContentType(contentType) ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES
}

export function sizeLimitMessage(contentType: string): string {
  return isVideoContentType(contentType) ? "Mỗi video tối đa 1 GB." : "Mỗi ảnh tối đa 8 MB."
}

export function buildMediaKey(contentType: MediaContentType): string {
  return `marketing/media/${randomUUID()}${MEDIA_TYPES[contentType]}`
}

/** Chặn client tự bịa key trỏ tới file khác trong storage. */
export function isMediaKey(key: string): boolean {
  return KEY_PATTERN.test(key)
}

export function contentTypeForKey(key: string): string {
  const entry = Object.entries(MEDIA_TYPES).find(([, ext]) => key.endsWith(ext))
  return entry?.[0] ?? "application/octet-stream"
}
