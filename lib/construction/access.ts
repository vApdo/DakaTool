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

/** Đặt/đổi mã quản lý. */
export async function setManagerCode(code: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: code },
    create: { key: SETTING_KEY, value: code },
  })
}

/**
 * Đặt mã LẦN ĐẦU một cách nguyên tử: dùng `create` (key là primary key) nên nếu
 * hai request cùng lúc thì chỉ một cái thắng, cái kia nhận false và phải nhập lại
 * đúng mã đã thắng — tránh cảnh cả hai tưởng mình đặt thành công.
 */
export async function tryClaimManagerCode(code: string): Promise<boolean> {
  try {
    await prisma.appSetting.create({ data: { key: SETTING_KEY, value: code } })
    return true
  } catch {
    return false
  }
}

/**
 * Chống dò mã: đếm số lần nhập sai theo IP trong bộ nhớ tiến trình.
 * Bộ đếm nằm ở DB (bảng ConstructionAuthAttempt) chứ không phải bộ nhớ tiến trình:
 * khi chạy serverless mỗi instance có bộ nhớ riêng, kẻ dò mã chỉ cần rơi vào
 * instance khác là được đếm lại từ đầu.
 */
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

export async function checkRateLimit(ip: string): Promise<boolean> {
  const rec = await prisma.constructionAuthAttempt.findUnique({ where: { ip } })
  if (!rec || Date.now() > rec.resetAt.getTime()) return true
  return rec.count < MAX_ATTEMPTS
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const now = Date.now()
  const resetAt = new Date(now + WINDOW_MS)
  const rec = await prisma.constructionAuthAttempt.findUnique({ where: { ip } })

  // Hết cửa sổ (hoặc chưa có bản ghi) → bắt đầu cửa sổ mới từ 1.
  if (!rec || now > rec.resetAt.getTime()) {
    await prisma.constructionAuthAttempt.upsert({
      where: { ip },
      create: { ip, count: 1, resetAt },
      update: { count: 1, resetAt },
    })
    return
  }

  await prisma.constructionAuthAttempt.update({
    where: { ip },
    data: { count: { increment: 1 } },
  })
}

export async function clearAttempts(ip: string): Promise<void> {
  await prisma.constructionAuthAttempt.deleteMany({ where: { ip } })
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
