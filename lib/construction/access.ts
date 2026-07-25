/**
 * Kiểm soát truy cập trang quản lý bằng MÃ (chưa có hệ thống tài khoản).
 *
 * - Mã quản lý lưu server-side trong AppSetting (key construction.managerCode),
 *   KHÔNG bao giờ trả về client.
 * - Nhập đúng mã → set cookie HttpOnly chứa HMAC(mã) — không lưu mã thô trong cookie,
 *   không cần bảng session. Đổi mã là mọi cookie cũ tự hết hiệu lực.
 * - Route ĐỌC (GET) mở tự do trong mạng nội bộ; mọi route GHI phải qua requireManager.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AccessError } from "@/lib/http"

const SETTING_KEY = "construction.managerCode"
export const MANAGER_COOKIE = "hqt_manager"
const HMAC_INFO = "dakatool-construction-manager-v1"

function tokenFor(code: string): string {
  // Secret dẫn xuất từ chính mã: đổi mã → token cũ vô hiệu.
  return createHmac("sha256", `${HMAC_INFO}:${code}`).update(HMAC_INFO).digest("hex")
}

export async function getManagerCode(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } })
  return row?.value ?? null
}

export async function isCodeConfigured(): Promise<boolean> {
  return (await getManagerCode()) !== null
}

/** Đặt mã lần đầu (chỉ khi CHƯA có) hoặc đổi mã khi đã xác thực. */
export async function setManagerCode(code: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: code },
    create: { key: SETTING_KEY, value: code },
  })
}

export async function verifyCode(code: string): Promise<boolean> {
  const stored = await getManagerCode()
  if (!stored) return false
  const a = Buffer.from(code)
  const b = Buffer.from(stored)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Gắn cookie đăng nhập quản lý vào response. */
export function attachManagerCookie(response: NextResponse, code: string): void {
  response.cookies.set(MANAGER_COOKIE, tokenFor(code), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
  })
}

export async function hasManagerAccess(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(MANAGER_COOKIE)?.value
  if (!cookie) return false
  const stored = await getManagerCode()
  if (!stored) return false
  const expected = tokenFor(stored)
  const a = Buffer.from(cookie)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Chặn route ghi: ném AccessError(unauthorized) nếu chưa đăng nhập quản lý. */
export async function requireManager(request: NextRequest): Promise<void> {
  if (!(await hasManagerAccess(request))) {
    throw new AccessError("Cần đăng nhập bằng mã quản lý.", "unauthorized")
  }
}

// Xuất riêng cho unit test (không phụ thuộc DB).
export const _internal = { tokenFor }
