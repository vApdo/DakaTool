/**
 * Mã duyệt bài Marketing (MKT_APPROVER_CODE), tách khỏi mã truy cập chung:
 * ai có mã DakaTool đều soạn bài được, nhưng chỉ người có mã duyệt mới đăng,
 * lên lịch, từ chối, huỷ lịch hoặc xoá bài đã lên Facebook.
 *
 * Cùng cơ chế với lib/access.ts: cookie chứa HMAC của mã (không chứa mã thô),
 * so sánh thời gian hằng, giới hạn số lần nhập sai theo IP (dùng chung bảng
 * AppAccessAttempt với khoá có tiền tố riêng).
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { checkAccessRateLimit, clearAccessAttempts, recordFailedAccessAttempt } from "@/lib/access"
import { AccessError } from "@/lib/http"

export const APPROVER_COOKIE = "dakatool_mkt_approver"
const HMAC_INFO = "dakatool-mkt-approver-v1"
const ATTEMPT_PREFIX = "mkt-approver:"

export function getApproverCode(): string | null {
  const code = process.env.MKT_APPROVER_CODE?.trim()
  return code ? code : null
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

function tokenFor(code: string): string {
  return createHmac("sha256", `${HMAC_INFO}:${code}`).update(HMAC_INFO).digest("hex")
}

export function verifyApproverCode(input: string): boolean {
  const stored = getApproverCode()
  if (!stored) return false
  return timingSafeEqual(digest(input), digest(stored))
}

export function hasApproverAccess(request: NextRequest): boolean {
  const cookie = request.cookies.get(APPROVER_COOKIE)?.value
  const stored = getApproverCode()
  if (!cookie || !stored) return false
  const actual = Buffer.from(cookie)
  const expected = Buffer.from(tokenFor(stored))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function requireApprover(request: NextRequest): void {
  if (!hasApproverAccess(request)) {
    throw new AccessError("Thao tác này cần mã duyệt của trưởng nhóm Marketing.", "forbidden")
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

/** Phiên duyệt ngắn hơn phiên DakaTool (12 giờ) vì quyền này đăng thẳng lên Fanpage. */
export function attachApproverCookie(response: NextResponse, code: string): void {
  response.cookies.set(APPROVER_COOKIE, tokenFor(code), cookieOptions(60 * 60 * 12))
}

export function clearApproverCookie(response: NextResponse): void {
  response.cookies.set(APPROVER_COOKIE, "", cookieOptions(0))
}

export const approverAttempts = {
  allowed: (ip: string) => checkAccessRateLimit(ATTEMPT_PREFIX + ip),
  recordFailure: (ip: string) => recordFailedAccessAttempt(ATTEMPT_PREFIX + ip),
  clear: (ip: string) => clearAccessAttempts(ATTEMPT_PREFIX + ip),
}

export const _internal = { tokenFor }
