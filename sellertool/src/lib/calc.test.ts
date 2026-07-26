import { describe, expect, it } from "vitest"
import { breakdown, reversePrice, type CalcSettings } from "./calc"
import { FEES } from "./fees"

/**
 * Số kỳ vọng trong file này đều TÍNH TAY được từ seed fees.json:
 * Shopee thường = giao dịch 6% + phí cố định (nhập tay 4%) + hạ tầng 3.000đ
 * + Freeship Xtra 5% trần 40.000đ + Voucher Xtra 4% trần 50.000đ; thuế 1,5%.
 */
const BASE: CalcSettings = {
  platformId: "shopee_normal",
  categoryId: "thoi_trang",
  enabledOptionalFeeIds: [],
  manualRates: { phi_co_dinh: 0.04 },
  packagingCost: 2000,
  returnRate: 0.03,
  returnCostPerOrder: 30000,
  taxEnabled: true,
}

describe("breakdown — chế độ 1", () => {
  it("1. bóc tách cơ bản: P=200k, C=120k, không gói, thuế bật", () => {
    const r = breakdown({ ...BASE, costPrice: 120000, sellPrice: 200000 }, FEES)
    // 6%×200k=12.000 + 4%×200k=8.000 + hạ tầng 3.000
    expect(r.platformTotal).toBe(23000)
    expect(r.taxAmount).toBe(3000) // 1,5% × 200k
    // 200.000 − 23.000 − 3.000 − 120.000 − 2.000 − 900 (=3%×30.000)
    expect(r.payout).toBe(51100)
    expect(r.netMarginPct).toBeCloseTo(0.2555, 4)
    expect(r.status).toBe("lai")
    expect(r.missingRateFeeIds).toEqual([])
  })

  it("2. gói % dưới trần: thêm Freeship Xtra ở P=200k", () => {
    const r = breakdown(
      { ...BASE, enabledOptionalFeeIds: ["freeship_xtra"], costPrice: 120000, sellPrice: 200000 },
      FEES,
    )
    const freeship = r.lines.find((l) => l.id === "freeship_xtra")
    expect(freeship?.amount).toBe(10000) // 5%×200k, chưa chạm trần 40k
    expect(freeship?.capped).toBe(false)
    expect(r.payout).toBe(41100)
  })

  it("3. trần kích hoạt: Freeship Xtra ở P=1.000.000", () => {
    const r = breakdown(
      { ...BASE, enabledOptionalFeeIds: ["freeship_xtra"], costPrice: 120000, sellPrice: 1000000 },
      FEES,
    )
    const freeship = r.lines.find((l) => l.id === "freeship_xtra")
    expect(freeship?.amount).toBe(40000) // 5%×1tr=50.000 → kịch trần 40.000
    expect(freeship?.capped).toBe(true)
    // 1.000.000 − (60.000+40.000+3.000+40.000) − 15.000 − 120.000 − 2.000 − 900
    expect(r.payout).toBe(719100)
  })

  it("4. tắt thuế: payout lệch bản bật thuế đúng 1,5% giá bán", () => {
    const on = breakdown({ ...BASE, costPrice: 120000, sellPrice: 200000 }, FEES)
    const off = breakdown({ ...BASE, taxEnabled: false, costPrice: 120000, sellPrice: 200000 }, FEES)
    expect(off.payout).toBe(54100)
    expect(off.payout - on.payout).toBe(3000) // đúng 1,5% × 200.000
    expect(off.taxAmount).toBe(0)
  })

  it("5. case lỗ: P=130k, C=120k → lỗ và cảnh báo trạng thái", () => {
    const r = breakdown({ ...BASE, costPrice: 120000, sellPrice: 130000 }, FEES)
    // 130.000 − (7.800+5.200+3.000) − 1.950 − 120.000 − 2.000 − 900
    expect(r.payout).toBe(-10850)
    expect(r.status).toBe("lo")
  })

  it("phí thiếu % (chưa nhập tay) được báo trong missingRateFeeIds", () => {
    const r = breakdown({ ...BASE, manualRates: {}, costPrice: 120000, sellPrice: 200000 }, FEES)
    expect(r.missingRateFeeIds).toEqual(["phi_co_dinh"])
  })

  it("nhập 0% là giá trị hợp lệ (phí được miễn) — không bị coi là chưa nhập", () => {
    const r = breakdown({ ...BASE, manualRates: { phi_co_dinh: 0 }, costPrice: 120000, sellPrice: 200000 }, FEES)
    expect(r.missingRateFeeIds).toEqual([])
    expect(r.lines.find((l) => l.id === "phi_co_dinh")?.amount).toBe(0)
    // payout = ca #1 nhưng không mất 8.000đ phí cố định
    expect(r.payout).toBe(59100)
  })

  it("giá bán thấp hơn giá vốn vẫn tính nhưng kèm cảnh báo", () => {
    const r = breakdown({ ...BASE, costPrice: 300000, sellPrice: 200000 }, FEES)
    expect(r.status).toBe("lo")
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe("reversePrice — chế độ 2", () => {
  it("6. không chạm trần: C=120k, lãi 20%, không gói", () => {
    const r = reversePrice({ ...BASE, costPrice: 120000, targetMargin: 0.2 }, FEES)
    expect(r.ok).toBe(true)
    // (120.000+2.000+900+3.000) / (1 − 0,10 − 0,015 − 0,20) = 183.795,62 → LÊN bội 500
    expect(r.price).toBe(184000)
    expect(r.iterations).toBe(1)
    // Phiếu chứng minh: lãi thực tế tại giá làm tròn phải ≥ mục tiêu.
    expect(r.receipt!.netMarginPct).toBeGreaterThanOrEqual(0.2)
  })

  it("7. trần kích hoạt sau vòng 1: C=800k, lãi 25%, Freeship Xtra bật", () => {
    const r = reversePrice(
      { ...BASE, enabledOptionalFeeIds: ["freeship_xtra"], costPrice: 800000, targetMargin: 0.25 },
      FEES,
    )
    expect(r.ok).toBe(true)
    // Vòng 1: P=805.900/0,585=1.377.607 → freeship 5% vượt trần 40k
    // Vòng 2: (805.900+40.000)/0,635=1.332.126 → LÊN bội 500
    expect(r.price).toBe(1332500)
    expect(r.iterations).toBe(2)
    expect(r.receipt!.lines.find((l) => l.id === "freeship_xtra")?.amount).toBe(40000)
    expect(r.receipt!.netMarginPct).toBeGreaterThanOrEqual(0.25)
  })

  it("8. lãi 85% với đủ 2 gói VẪN KHẢ THI: phí kịch trần ngừng ăn % khi giá đủ lớn", () => {
    const r = reversePrice(
      {
        ...BASE,
        enabledOptionalFeeIds: ["freeship_xtra", "voucher_xtra"],
        costPrice: 120000,
        targetMargin: 0.85,
      },
      FEES,
    )
    expect(r.ok).toBe(true)
    // Cả 2 gói kịch trần (40k + 50k thành hằng số): (125.900+90.000)/(1−0,10−0,015−0,85)
    // = 215.900/0,035 = 6.168.571 → LÊN bội 500
    expect(r.price).toBe(6169000)
    expect(r.receipt!.lines.find((l) => l.id === "freeship_xtra")?.capped).toBe(true)
    expect(r.receipt!.lines.find((l) => l.id === "voucher_xtra")?.capped).toBe(true)
    expect(r.receipt!.netMarginPct).toBeGreaterThanOrEqual(0.85)
  })

  it("9. bất khả thi thật: lãi 89% — các phí KHÔNG trần + thuế đã chiếm 11,5%", () => {
    const r = reversePrice(
      {
        ...BASE,
        enabledOptionalFeeIds: ["freeship_xtra", "voucher_xtra"],
        costPrice: 120000,
        targetMargin: 0.89,
      },
      FEES,
    )
    // 1 − (0,06 + 0,04) − 0,015 = 0,885 < 0,89 → không giá nào đạt được.
    expect(r.ok).toBe(false)
    expect(r.error?.code).toBe("infeasible")
    expect(r.error?.message).toContain("11,5%")
    expect(r.error?.message).toContain("88,5%")
  })

  it("10. giá TỐI THIỂU khi 2 phí cùng vượt trần ở vòng 1 rồi giá giải lại tụt xuống dưới trần phí nhỏ", () => {
    // Ca bắt lỗi từ review: nếu giữ cứng cả 2 phí ở trần, tool trả 1.220.000đ —
    // cao hơn giá tối thiểu thật 1.218.000đ (tại đó Voucher Xtra chưa chạm trần).
    const r = reversePrice(
      {
        ...BASE,
        enabledOptionalFeeIds: ["freeship_xtra", "voucher_xtra"],
        packagingCost: 2900,
        returnRate: 0,
        costPrice: 617800,
        targetMargin: 0.3,
      },
      FEES,
    )
    expect(r.ok).toBe(true)
    expect(r.price).toBe(1218000)
    const voucher = r.receipt!.lines.find((l) => l.id === "voucher_xtra")
    expect(voucher?.capped).toBe(false) // 4% × 1.218.000 = 48.720 < trần 50.000
    expect(r.receipt!.netMarginPct).toBeGreaterThanOrEqual(0.3)
  })

  it("11. lãi mục tiêu 0% hợp lệ — trả về giá hòa vốn tối thiểu", () => {
    const r = reversePrice({ ...BASE, costPrice: 120000, targetMargin: 0 }, FEES)
    expect(r.ok).toBe(true)
    // 125.900 / (1 − 0,10 − 0,015) = 142.260 → LÊN bội 500
    expect(r.price).toBe(142500)
    expect(r.receipt!.payout).toBeGreaterThanOrEqual(0)
  })

  it("input không hợp lệ bị chặn bằng thông báo tiếng Việt", () => {
    expect(reversePrice({ ...BASE, costPrice: 0, targetMargin: 0.2 }, FEES).error?.code).toBe("invalid_input")
    expect(reversePrice({ ...BASE, costPrice: 120000, targetMargin: 1.2 }, FEES).error?.code).toBe("invalid_input")
    expect(reversePrice({ ...BASE, costPrice: 120000, targetMargin: -0.1 }, FEES).error?.code).toBe("invalid_input")
    const missing = reversePrice({ ...BASE, manualRates: {}, costPrice: 120000, targetMargin: 0.2 }, FEES)
    expect(missing.error?.code).toBe("invalid_input")
    expect(missing.error?.message).toContain("Phí cố định theo ngành hàng")
  })

  it("ca 60% trong spec thực tế KHẢ THI với biểu phí seed (đã ghi chú README)", () => {
    const r = reversePrice(
      {
        ...BASE,
        enabledOptionalFeeIds: ["freeship_xtra", "voucher_xtra"],
        costPrice: 120000,
        targetMargin: 0.6,
      },
      FEES,
    )
    // Mẫu số 1 − 0,19 − 0,015 − 0,60 = 0,195 > 0 → vẫn ra giá hợp lệ (~646.000đ).
    expect(r.ok).toBe(true)
    expect(r.price).toBeGreaterThan(600000)
    expect(r.receipt!.netMarginPct).toBeGreaterThanOrEqual(0.6)
  })
})
