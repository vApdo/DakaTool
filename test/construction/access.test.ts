/**
 * Test cho lớp kiểm soát truy cập của module Quản lý công trình.
 *
 * Hai rủi ro chính được nhắm tới:
 *  1. `timingSafeEqual` NÉM LỖI nếu hai buffer khác độ dài. Thiếu chốt so độ dài
 *     thì chỉ cần gửi cookie dài ngắn bất thường là route ghi sập 500 — vừa lộ
 *     thông tin, vừa là cách gây lỗi rẻ tiền cho người ngoài.
 *  2. Đổi mã quản lý phải vô hiệu hoá mọi cookie cũ (không có bảng session nên
 *     đây là cơ chế duy nhất để "đăng xuất tất cả").
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as access from "@/lib/construction/access"
import { AccessError } from "@/lib/http"

// vi.hoisted: mock phải tồn tại TRƯỚC khi module dưới test được nạp.
const prismaMock = vi.hoisted(() => ({
  appSetting: { findUnique: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  constructionAuthAttempt: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const CODE = "matquanly123"

/** NextRequest giả — requireManager/hasManagerAccess chỉ đọc cookies.get(). */
function requestWithCookie(value?: string) {
  return {
    cookies: { get: (name: string) => (value !== undefined && name === access.MANAGER_COOKIE ? { value } : undefined) },
  } as never
}

function storedCode(code: string | null) {
  prismaMock.appSetting.findUnique.mockResolvedValue(code === null ? null : { value: code })
}

beforeEach(() => {
  vi.clearAllMocks()
  storedCode(CODE)
})

describe("token cookie", () => {
  it("cùng mã sinh cùng token, khác mã sinh khác token", () => {
    const { tokenFor } = access._internal
    expect(tokenFor(CODE)).toBe(tokenFor(CODE))
    expect(tokenFor(CODE)).not.toBe(tokenFor("matkhac999"))
  })

  it("token không chứa mã thô (cookie lộ cũng không đọc ra mã)", () => {
    expect(access._internal.tokenFor(CODE)).not.toContain(CODE)
  })
})

describe("hasManagerAccess", () => {
  it("không có cookie → từ chối", async () => {
    expect(await access.hasManagerAccess(requestWithCookie())).toBe(false)
  })

  it("cookie đúng → cho qua", async () => {
    const token = access._internal.tokenFor(CODE)
    expect(await access.hasManagerAccess(requestWithCookie(token))).toBe(true)
  })

  it("cookie sai nhưng CÙNG độ dài → từ chối", async () => {
    const token = access._internal.tokenFor(CODE)
    const sai = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")
    expect(sai).toHaveLength(token.length)
    expect(await access.hasManagerAccess(requestWithCookie(sai))).toBe(false)
  })

  it("cookie KHÁC độ dài → từ chối, không ném lỗi (chốt của timingSafeEqual)", async () => {
    await expect(access.hasManagerAccess(requestWithCookie("x"))).resolves.toBe(false)
    await expect(access.hasManagerAccess(requestWithCookie("y".repeat(500)))).resolves.toBe(false)
    await expect(access.hasManagerAccess(requestWithCookie(""))).resolves.toBe(false)
  })

  it("đổi mã quản lý → cookie cũ hết hiệu lực", async () => {
    const cookieCu = access._internal.tokenFor(CODE)
    storedCode("ma-moi-vua-doi")
    expect(await access.hasManagerAccess(requestWithCookie(cookieCu))).toBe(false)
  })

  it("chưa đặt mã → mọi cookie đều vô hiệu", async () => {
    const token = access._internal.tokenFor(CODE)
    storedCode(null)
    expect(await access.hasManagerAccess(requestWithCookie(token))).toBe(false)
  })
})

describe("requireManager", () => {
  it("chưa đăng nhập → AccessError(unauthorized)", async () => {
    await expect(access.requireManager(requestWithCookie())).rejects.toMatchObject({
      name: "AccessError",
      kind: "unauthorized",
    })
    await expect(access.requireManager(requestWithCookie())).rejects.toBeInstanceOf(AccessError)
  })

  it("đã đăng nhập → không ném", async () => {
    const token = access._internal.tokenFor(CODE)
    await expect(access.requireManager(requestWithCookie(token))).resolves.toBeUndefined()
  })
})

describe("verifyCode", () => {
  it("đúng mã → true", async () => {
    expect(await access.verifyCode(CODE)).toBe(true)
  })

  it("sai mã cùng độ dài → false", async () => {
    expect(await access.verifyCode("matquanly124")).toBe(false)
  })

  it("sai mã khác độ dài → false, không ném", async () => {
    await expect(access.verifyCode("a")).resolves.toBe(false)
    await expect(access.verifyCode(CODE + "thua")).resolves.toBe(false)
  })

  it("chưa đặt mã → false", async () => {
    storedCode(null)
    expect(await access.verifyCode(CODE)).toBe(false)
  })
})

describe("tryClaimManagerCode", () => {
  it("đặt được lần đầu → true", async () => {
    prismaMock.appSetting.create.mockResolvedValue({})
    expect(await access.tryClaimManagerCode(CODE)).toBe(true)
  })

  it("đã có người đặt trước (create đụng khoá chính) → false", async () => {
    prismaMock.appSetting.create.mockRejectedValue(new Error("unique constraint"))
    expect(await access.tryClaimManagerCode(CODE)).toBe(false)
  })
})

describe("chống dò mã", () => {
  const IP = "10.0.0.7"
  const tuongLai = () => new Date(Date.now() + 60_000)
  const quaKhu = () => new Date(Date.now() - 60_000)

  it("chưa có bản ghi → cho phép", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue(null)
    expect(await access.checkRateLimit(IP)).toBe(true)
  })

  it("dưới ngưỡng → cho phép", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue({ count: 7, resetAt: tuongLai() })
    expect(await access.checkRateLimit(IP)).toBe(true)
  })

  it("chạm ngưỡng 8 lần → chặn", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue({ count: 8, resetAt: tuongLai() })
    expect(await access.checkRateLimit(IP)).toBe(false)
  })

  it("hết cửa sổ 10 phút → cho phép lại dù count cao", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue({ count: 99, resetAt: quaKhu() })
    expect(await access.checkRateLimit(IP)).toBe(true)
  })

  it("sai trong cửa sổ đang mở → tăng bộ đếm, KHÔNG dời hạn (tránh dò mã vô hạn)", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue({ count: 3, resetAt: tuongLai() })
    await access.recordFailedAttempt(IP)

    expect(prismaMock.constructionAuthAttempt.update).toHaveBeenCalledWith({
      where: { ip: IP },
      data: { count: { increment: 1 } },
    })
    expect(prismaMock.constructionAuthAttempt.upsert).not.toHaveBeenCalled()
  })

  it("sai sau khi hết cửa sổ → mở cửa sổ mới đếm từ 1", async () => {
    prismaMock.constructionAuthAttempt.findUnique.mockResolvedValue({ count: 99, resetAt: quaKhu() })
    await access.recordFailedAttempt(IP)

    const arg = prismaMock.constructionAuthAttempt.upsert.mock.calls[0][0]
    expect(arg.update.count).toBe(1)
    expect(arg.create.count).toBe(1)
    expect(prismaMock.constructionAuthAttempt.update).not.toHaveBeenCalled()
  })

  it("đăng nhập đúng → xoá bộ đếm của IP đó", async () => {
    await access.clearAttempts(IP)
    expect(prismaMock.constructionAuthAttempt.deleteMany).toHaveBeenCalledWith({ where: { ip: IP } })
  })
})
