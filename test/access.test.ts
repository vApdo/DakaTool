import { beforeEach, describe, expect, it, vi } from "vitest"
import * as access from "@/lib/access"
import { AccessError } from "@/lib/http"

const prismaMock = vi.hoisted(() => ({
  appSetting: { findUnique: vi.fn() },
  appAccessAttempt: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const CODE = "DakaTool-noi-bo-2026"

function requestWithCookie(value?: string) {
  return {
    cookies: {
      get: (name: string) => (value !== undefined && name === access.ACCESS_COOKIE ? { value } : undefined),
    },
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DAKATOOL_ACCESS_CODE = CODE
})

describe("DakaTool access token", () => {
  it("không chứa mã thô và thay đổi khi mã thay đổi", () => {
    const token = access._internal.tokenFor(CODE)
    expect(token).not.toContain(CODE)
    expect(token).not.toBe(access._internal.tokenFor(`${CODE}-khac`))
  })

  it("chấp nhận cookie đúng và từ chối cookie sai độ dài mà không ném lỗi", async () => {
    const token = access._internal.tokenFor(CODE)
    await expect(access.hasAppAccess(requestWithCookie(token))).resolves.toBe(true)
    await expect(access.hasAppAccess(requestWithCookie("x"))).resolves.toBe(false)
    await expect(access.hasAppAccess(requestWithCookie("y".repeat(500)))).resolves.toBe(false)
  })

  it("requireAppAccess trả lỗi unauthorized khi chưa có cookie", async () => {
    await expect(access.requireAppAccess(requestWithCookie())).rejects.toBeInstanceOf(AccessError)
    await expect(access.requireAppAccess(requestWithCookie())).rejects.toMatchObject({ kind: "unauthorized" })
  })
})

describe("access code source and verification", () => {
  it("ưu tiên mã trong biến môi trường", async () => {
    prismaMock.appSetting.findUnique.mockResolvedValue({ value: "legacy-code" })
    await expect(access.getAccessCode()).resolves.toBe(CODE)
    expect(prismaMock.appSetting.findUnique).not.toHaveBeenCalled()
  })

  it("dùng lại mã quản lý cũ khi chưa có biến môi trường", async () => {
    delete process.env.DAKATOOL_ACCESS_CODE
    prismaMock.appSetting.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ value: "legacy-code" })
    await expect(access.getAccessCode()).resolves.toBe("legacy-code")
  })

  it("so sánh mã đúng và sai an toàn với mọi độ dài", async () => {
    await expect(access.verifyAccessCode(CODE)).resolves.toBe(true)
    await expect(access.verifyAccessCode("sai")).resolves.toBe(false)
    await expect(access.verifyAccessCode(`${CODE}-dai-hon`)).resolves.toBe(false)
  })
})

describe("access rate limit", () => {
  const IP = "10.0.0.8"
  const future = () => new Date(Date.now() + 60_000)
  const past = () => new Date(Date.now() - 60_000)

  it("cho phép khi chưa có lần nhập sai", async () => {
    prismaMock.appAccessAttempt.findUnique.mockResolvedValue(null)
    await expect(access.checkAccessRateLimit(IP)).resolves.toBe(true)
  })

  it("chặn khi đã sai đủ 8 lần trong cửa sổ", async () => {
    prismaMock.appAccessAttempt.findUnique.mockResolvedValue({ count: 8, resetAt: future() })
    await expect(access.checkAccessRateLimit(IP)).resolves.toBe(false)
  })

  it("mở cửa sổ mới khi lần ghi cũ đã hết hạn", async () => {
    prismaMock.appAccessAttempt.findUnique.mockResolvedValue({ count: 20, resetAt: past() })
    await access.recordFailedAccessAttempt(IP)
    expect(prismaMock.appAccessAttempt.upsert).toHaveBeenCalledWith({
      where: { ip: IP },
      create: { ip: IP, count: 1, resetAt: expect.any(Date) },
      update: { count: 1, resetAt: expect.any(Date) },
    })
  })

  it("tăng bộ đếm nhưng không dời hạn trong cửa sổ hiện tại", async () => {
    prismaMock.appAccessAttempt.findUnique.mockResolvedValue({ count: 3, resetAt: future() })
    await access.recordFailedAccessAttempt(IP)
    expect(prismaMock.appAccessAttempt.update).toHaveBeenCalledWith({
      where: { ip: IP },
      data: { count: { increment: 1 } },
    })
    expect(prismaMock.appAccessAttempt.upsert).not.toHaveBeenCalled()
  })
})
