/**
 * Ảnh đính kèm bài viết: key do server sinh, chỉ nhận định dạng Facebook đăng được.
 */
import { randomUUID } from "node:crypto"

export const MAX_PHOTOS = 10
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export const PHOTO_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
} as const

export type PhotoContentType = keyof typeof PHOTO_TYPES

const KEY_PATTERN = /^marketing\/media\/[0-9a-f-]{36}\.(jpg|png|gif)$/

export function isPhotoContentType(value: string): value is PhotoContentType {
  return Object.prototype.hasOwnProperty.call(PHOTO_TYPES, value)
}

export function buildMediaKey(contentType: PhotoContentType): string {
  return `marketing/media/${randomUUID()}${PHOTO_TYPES[contentType]}`
}

/** Chặn client tự bịa key trỏ tới file khác trong storage. */
export function isMediaKey(key: string): boolean {
  return KEY_PATTERN.test(key)
}
