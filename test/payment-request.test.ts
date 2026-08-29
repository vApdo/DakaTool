import { describe, expect, it } from "vitest"
import {
  calculatePaymentTotal,
  COMPANY_PROFILES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_REQUESTERS,
  formatVietnameseDate,
  numberToVietnameseWords,
  paymentRecipient,
  type PaymentRequestItem,
} from "@/lib/payment-request"

describe("payment request helpers", () => {
  it("calculates totals from quantity and unit price", () => {
    const items: PaymentRequestItem[] = [
      { id: "1", name: "A", unit: "cái", quantity: 2, unitPrice: 125_000, note: "" },
      { id: "2", name: "B", unit: "bộ", quantity: 3, unitPrice: 200_000, note: "" },
    ]
    expect(calculatePaymentTotal(items)).toBe(850_000)
  })

  it.each([
    [0, "Không đồng chẵn"],
    [15, "Mười lăm đồng chẵn"],
    [105, "Một trăm lẻ năm đồng chẵn"],
    [1_250_000, "Một triệu hai trăm năm mươi nghìn đồng chẵn"],
    [5_850_000, "Năm triệu tám trăm năm mươi nghìn đồng chẵn"],
  ])("writes %i VND in Vietnamese", (value, expected) => {
    expect(numberToVietnameseWords(value)).toBe(expected)
  })

  it("formats an ISO date in the form wording", () => {
    expect(formatVietnameseDate("2026-08-06")).toBe("Ngày 06 tháng 08 năm 2026")
  })

  it("builds a recipient line from the selected company", () => {
    expect(paymentRecipient("CÔNG TY TNHH DAKATOOL")).toBe("Ban lãnh đạo CÔNG TY TNHH DAKATOOL")
  })

  it("provides the approved requester, department, and company catalogs", () => {
    expect(DEFAULT_REQUESTERS).toEqual(["Nguyễn Đăng Vít", "Trần Thị Phương Thảo", "Bùi Thị Thúy Nga"])
    expect(DEFAULT_DEPARTMENTS).toEqual(["Kế hoạch & Tổng hợp", "Marketing", "HCNS"])
    expect(COMPANY_PROFILES).toEqual([
      {
        id: "a2s-accounting",
        name: "CÔNG TY TNHH DỊCH VỤ KẾ TOÁN Á CHÂU A2S",
        address: "Lô 787 KĐT Nam Vĩnh Yên – Vĩnh Phúc - Phú Thọ",
      },
      {
        id: "asia-group",
        name: "CÔNG TY TNHH TẬP ĐOÀN Á CHÂU ASIA GROUP",
        address: "Lô 787 KĐT Nam Vĩnh Yên – Vĩnh Yên - Phú Thọ",
      },
      {
        id: "hqt-technology",
        name: "CÔNG TY CỔ PHẦN KỸ THUẬT CÔNG NGHỆ HQT",
        address: "Cụm CN Làng nghề Minh Phương - Nguyệt Đức - Phú Thọ",
      },
    ])
  })
})
