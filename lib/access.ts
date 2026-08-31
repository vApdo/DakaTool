import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AccessError } from "@/lib/http"

export const ACCESS_COOKIE = "dakatool_access"
const HMAC_INFO = "dakatool-internal-access-v1"
const ENV_KEY = "DAKATOOL_ACCESS_CODE"
const SETTING_KEYS = ["dakatool.accessCode", "construction.managerCode"] as const
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

function configuredEnvCode(): string | null {
  const code = process.env[ENV_KEY]?.trim()
  return code ? code : null
}

/**
 * Ưu tiên mã trong biến môi trường. Fallback AppSetting giữ tương thích với mã
 * quản lý đã từng được đặt trước khi module công trình bị gỡ khỏi giao diện.
 */
export async function getAccessCode(): Promise<string | null> {
  const envCode = configuredEnvCode()
  if (envCode) return envCode

  for (const key of SETTING_KEYS) {
    const setting = await prisma.appSetting.findUnique({ where: { key } })
    if (setting?.value.trim()) return setting.value.trim()
  }
  return null
}

export async function isAccessCodeConfigured(): Promise<boolean> {
  return (await getAccessCode()) !== null
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

export async function verifyAccessCode(input: string): Promise<boolean> {
  const stored = await getAccessCode()
  if (!stored) return false
  return timingSafeEqual(digest(input), digest(stored))
}

function tokenFor(code: string): string {
  return createHmac("sha256", `${HMAC_INFO}:${code}`).update(HMAC_INFO).digest("hex")
}

export function attachAccessCookie(response: NextResponse, code: string): void {
  response.cookies.set(ACCESS_COOKIE, tokenFor(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function hasAppAccess(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(ACCESS_COOKIE)?.value
  if (!cookie) return false
  const stored = await getAccessCode()
  if (!stored) return false
  const actual = Buffer.from(cookie)
  const expected = Buffer.from(tokenFor(stored))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function requireAppAccess(request: NextRequest): Promise<void> {
  if (!(await hasAppAccess(request))) {
    throw new AccessError("Cần nhập mã truy cập DakaTool.", "unauthorized")
  }
}

export async function checkAccessRateLimit(ip: string): Promise<boolean> {
  const record = await prisma.appAccessAttempt.findUnique({ where: { ip } })
  if (!record || Date.now() > record.resetAt.getTime()) return true
  return record.count < MAX_ATTEMPTS
}

export async function recordFailedAccessAttempt(ip: string): Promise<void> {
  const now = Date.now()
  const resetAt = new Date(now + WINDOW_MS)
  const record = await prisma.appAccessAttempt.findUnique({ where: { ip } })

  if (!record || now > record.resetAt.getTime()) {
    await prisma.appAccessAttempt.upsert({
      where: { ip },
      create: { ip, count: 1, resetAt },
      update: { count: 1, resetAt },
    })
    return
  }

  await prisma.appAccessAttempt.update({
    where: { ip },
    data: { count: { increment: 1 } },
  })
}

export async function clearAccessAttempts(ip: string): Promise<void> {
  await prisma.appAccessAttempt.deleteMany({ where: { ip } })
}

export function requestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 128)
}

export const _internal = { tokenFor, digest }
