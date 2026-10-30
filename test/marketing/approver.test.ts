import { beforeEach, describe, expect, it, vi } from "vitest"
import * as approver from "@/lib/marketing/approver"
import { AccessError } from "@/lib/http"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

const CODE = "truong-nhom-mkt"

function request(cookie?: string) {
  return {
    cookies: { get: (name: string) => (cookie !== undefined && name === approver.APPROVER_COOKIE ? { value: cookie } : undefined) },
  } as never
}

beforeEach(() => {
  process.env.MKT_APPROVER_CODE = CODE
})

describe("mã duyệt Marketing", () => {
  it("so mã đúng/sai", () => {
    expect(approver.verifyApproverCode(CODE)).toBe(true)
    expect(approver.verifyApproverCode("sai-ma")).toBe(false)
  })

  it("cookie không chứa mã thô và chỉ hợp lệ với mã hiện tại", () => {
    const token = approver._internal.tokenFor(CODE)
    expect(token).not.toContain(CODE)
    expect(approver.hasApproverAccess(request(token))).toBe(true)
    process.env.MKT_APPROVER_CODE = "ma-moi"
    expect(approver.hasApproverAccess(request(token))).toBe(false)
  })

  it("chặn thao tác duyệt khi chưa nhập mã", () => {
    expect(() => approver.requireApprover(request())).toThrow(AccessError)
  })

  it("chưa đặt mã thì không ai duyệt được", () => {
    delete process.env.MKT_APPROVER_CODE
    expect(approver.verifyApproverCode(CODE)).toBe(false)
    expect(approver.hasApproverAccess(request(approver._internal.tokenFor(CODE)))).toBe(false)
  })
})
