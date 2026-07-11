import { describe, expect, it } from "vitest"
import {
  detectFreightType,
  detectHsCode,
  detectReleaseType,
  detectShippedOnBoardDate,
  normalizeLineBreaks,
  normalizeWhitespace,
  parseContainerString,
} from "@/lib/pdf/normalize-fields"

describe("normalizeWhitespace", () => {
  it("gộp khoảng trắng liên tiếp và trim", () => {
    expect(normalizeWhitespace("  HONG   KONG \t LIMITED ")).toBe("HONG KONG LIMITED")
  })
})

describe("normalizeLineBreaks", () => {
  it("chuẩn hóa CRLF và bỏ dòng trống lặp", () => {
    expect(normalizeLineBreaks("A\r\n\r\n\r\nB\r\nC")).toBe("A\n\nB\nC")
  })
})

describe("parseContainerString", () => {
  it("tách đúng chuỗi container chuẩn của đề bài", () => {
    const parsed = parseContainerString(
      "WHSU8729485 / 40'HQ / WHLY064496 / 2SKIDS / 140.000KGS / 2.6110CBM",
    )
    expect(parsed).toEqual({
      containerNo: "WHSU8729485",
      containerType: "40'HQ",
      sealNo: "WHLY064496",
      packages: "2",
      packageType: "SKIDS",
      grossWeight: "140.000 KGS",
      cbm: "2.6110 CBM",
    })
  })

  it("trả về null khi không có số container", () => {
    expect(parseContainerString("SAY TWO(2) SKIDS ONLY")).toBeNull()
  })

  it("chịu được khoảng trắng quanh dấu /", () => {
    const parsed = parseContainerString("TCLU1234567 / 20'GP / ABC12345 / 10 CARTONS / 500KGS / 1.5CBM")
    expect(parsed?.containerNo).toBe("TCLU1234567")
    expect(parsed?.containerType).toBe("20'GP")
    expect(parsed?.packages).toBe("10")
    expect(parsed?.packageType).toBe("CARTONS")
  })
})

describe("detectReleaseType", () => {
  it("TELEX RELEASE → SURRENDER", () => {
    expect(detectReleaseType("... TELEX RELEASE ...").value).toBe("SURRENDER")
  })
  it("SURRENDER thắng ORIGINAL khi cùng xuất hiện", () => {
    expect(detectReleaseType("ORIGINAL ... TELEX RELEASE").value).toBe("SURRENDER")
  })
  it("SEA WAYBILL → WAYBILL", () => {
    expect(detectReleaseType("SEA WAYBILL").value).toBe("WAYBILL")
  })
  it("ORIGINAL đơn lẻ → ORIGINAL", () => {
    expect(detectReleaseType("3 ORIGINAL B/L").value).toBe("ORIGINAL")
  })
  it("không có gì → UNKNOWN", () => {
    expect(detectReleaseType("nothing here").value).toBe("UNKNOWN")
  })
})

describe("detectFreightType", () => {
  it("FREIGHT PREPAID → PREPAID", () => {
    expect(detectFreightType("FREIGHT PREPAID").value).toBe("PREPAID")
  })
  it("FREIGHT COLLECT → COLLECT", () => {
    expect(detectFreightType("FREIGHT COLLECT").value).toBe("COLLECT")
  })
})

describe("detectShippedOnBoardDate", () => {
  it("lấy ngày cạnh cụm SHIPPED ON BOARD", () => {
    expect(detectShippedOnBoardDate("SHIPPED ON BOARD 28-JUN-2026").value).toBe("28-JUN-2026")
  })
})

describe("detectHsCode", () => {
  it("lấy số sau HS CODE", () => {
    expect(detectHsCode("INVERTER 2 CHOME HS CODE 90318080").value).toBe("90318080")
  })
})
