import { describe, expect, it } from "vitest"
import rawFees from "../data/fees.json"
import { assertFeeConfig } from "./fees"
import { formatPercent, formatVND, groupDigits, parseVNDInput, roundUpTo } from "./money"

describe("formatVND / groupDigits", () => {
  it("nhóm nghìn bằng dấu chấm kiểu Việt", () => {
    expect(formatVND(1250000)).toBe("1.250.000đ")
    expect(formatVND(1000)).toBe("1.000đ")
    expect(formatVND(500)).toBe("500đ")
    expect(formatVND(0)).toBe("0đ")
    expect(groupDigits(200000)).toBe("200.000")
  })

  it("số âm giữ dấu trừ trước số", () => {
    expect(formatVND(-4200)).toBe("-4.200đ")
  })
})

describe("parseVNDInput", () => {
  it("đọc được chuỗi đã format và chuỗi thô", () => {
    expect(parseVNDInput("1.250.000")).toBe(1250000)
    expect(parseVNDInput("1250000")).toBe(1250000)
    expect(parseVNDInput("200.000đ")).toBe(200000)
  })

  it("rỗng hoặc không có chữ số → null", () => {
    expect(parseVNDInput("")).toBeNull()
    expect(parseVNDInput("abc")).toBeNull()
  })
})

describe("formatPercent", () => {
  it("dấu phẩy thập phân kiểu Việt, tối đa 2 chữ số lẻ", () => {
    expect(formatPercent(0.06)).toBe("6%")
    expect(formatPercent(0.015)).toBe("1,5%")
    expect(formatPercent(0.205)).toBe("20,5%")
    expect(formatPercent(0.2555)).toBe("25,55%")
  })
})

describe("roundUpTo", () => {
  it("làm tròn LÊN bội 500", () => {
    expect(roundUpTo(183795.62, 500)).toBe(184000)
    expect(roundUpTo(184001, 500)).toBe(184500)
  })

  it("bội đúng 500 giữ nguyên (kể cả sai số dấu phẩy động)", () => {
    expect(roundUpTo(184000, 500)).toBe(184000)
    expect(roundUpTo(184000.0000001, 500)).toBe(184000)
  })
})

describe("fees.json", () => {
  it("đúng schema — sửa data sai cấu trúc là test đỏ ngay", () => {
    const config = assertFeeConfig(rawFees)
    expect(config.platforms.map((p) => p.id)).toEqual(["shopee_normal", "tiktok_shop"])
    expect(config.tax.rate).toBeGreaterThan(0)
  })

  it("bắt được lỗi cấu trúc kèm đường dẫn", () => {
    const broken = JSON.parse(JSON.stringify(rawFees)) as { platforms: { fees: { cap: unknown }[] }[] }
    broken.platforms[0].fees[0].cap = "40k"
    expect(() => assertFeeConfig(broken)).toThrow(/platforms\[0\]\.fees\[0\]\.cap/)
  })
})
