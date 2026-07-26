/**
 * Danh tính chủ sở hữu project khi CHƯA có hệ thống auth.
 *
 * Dùng một cookie ngẫu nhiên (daka_owner) làm "chủ sở hữu ẩn danh": project tạo ra
 * gắn với owner này, request sau mang cookie để truy cập lại. Đây KHÔNG phải auth
 * mạnh — chỉ ngăn người khác vô tình thấy project của nhau. Khi có auth thật,
 * thay hàm này bằng user id từ session.
 */
import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"

export const OWNER_COOKIE = "daka_owner"

export function getOwnerId(request: NextRequest): string | null {
  return request.cookies.get(OWNER_COOKIE)?.value ?? null
}

/** Lấy owner hiện có hoặc sinh mới (caller có trách nhiệm set cookie khi mới). */
export function resolveOwnerId(request: NextRequest): { ownerId: string; isNew: boolean } {
  const existing = getOwnerId(request)
  if (existing) return { ownerId: existing, isNew: false }
  return { ownerId: randomUUID(), isNew: true }
}
