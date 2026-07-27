import type { FeeConfig, Platform } from "./fees"
import { formatPercent, formatVND, roundUpTo } from "./money"

/**
 * Toàn bộ công thức của tool — thuần túy, không React, không DOM.
 *
 * Ký hiệu theo spec: P = giá bán, C = giá vốn, G = phí đóng gói/đơn,
 * h = % đơn hoàn dự kiến, H = chi phí mất mỗi đơn hoàn, t = thuế suất, m = % lãi mục tiêu.
 *
 * Quy ước tiền: từng dòng phí được làm tròn về đồng nguyên NGAY khi tính,
 * mọi dòng tổng cộng từ các dòng đã làm tròn — để biên lai cộng dọc khớp tuyệt đối.
 */

export interface CalcSettings {
  platformId: string
  categoryId: string
  /** Các gói optional đang bật (Freeship Xtra...). */
  enabledOptionalFeeIds: string[]
  /** % người dùng tự nhập (dạng phân số) cho các phí có rate null trong fees.json. */
  manualRates: Record<string, number>
  /** G — phí đóng gói mỗi đơn. */
  packagingCost: number
  /** h — tỉ lệ đơn hoàn dự kiến (phân số, 0.03 = 3%). */
  returnRate: number
  /** H — chi phí mất mỗi đơn hoàn. */
  returnCostPerOrder: number
  taxEnabled: boolean
}

export interface ResolvedFee {
  id: string
  label: string
  kind: "percent" | "flat"
  /** Phân số, chỉ có với kind "percent". */
  rate: number
  /** VND, chỉ có với kind "flat". */
  amount: number
  cap: number | null
  verified: boolean
  /** Rate null trong data và người dùng chưa nhập — chưa tính được. */
  missing: boolean
}

export interface ReceiptLine {
  id: string
  label: string
  /** VND, luôn ≥ 0 — UI tự thêm dấu trừ khi hiển thị. */
  amount: number
  kind: "fee" | "tax" | "cost" | "packaging" | "returns"
  /** Phí % đã chạm trần. */
  capped?: boolean
  verified: boolean
  /** Diễn giải cách tính, vd "6% × 200.000đ". */
  note?: string
}

export interface Receipt {
  sellPrice: number
  lines: ReceiptLine[]
  /** Tổng các phí sàn (percent + flat) — dòng "SÀN GIỮ LẠI". */
  platformTotal: number
  taxAmount: number
  costPrice: number
  packagingCost: number
  /** Dự phòng hoàn R = h × H (đã làm tròn). */
  returnsReserve: number
  /** TIỀN VỀ TAY mỗi đơn (đã trừ vốn, đóng gói, dự phòng hoàn). */
  payout: number
  /** payout / sellPrice. */
  netMarginPct: number
  status: "lai" | "hoa" | "lo"
  warnings: string[]
  /** Phí chưa có % (data null, chưa nhập tay) — UI chặn hiển thị kết quả khi còn phần tử. */
  missingRateFeeIds: string[]
}

export interface ReverseResult {
  ok: boolean
  /** Giá bán tối thiểu, đã làm tròn LÊN bội 500đ. */
  price?: number
  /** Phiếu bóc tách tại mức giá đó để chứng minh. */
  receipt?: Receipt
  iterations?: number
  error?: { code: "infeasible" | "invalid_input"; message: string }
}

export function getPlatform(config: FeeConfig, platformId: string): Platform {
  const platform = config.platforms.find((p) => p.id === platformId)
  if (!platform) throw new Error(`Không có sàn "${platformId}" trong biểu phí.`)
  return platform
}

/**
 * Chốt danh sách phí áp dụng cho lựa chọn hiện tại: bỏ gói optional chưa bật,
 * tra % theo ngành, thay rate null bằng % người dùng nhập tay (nếu có).
 */
export function resolveActiveFees(settings: CalcSettings, config: FeeConfig): ResolvedFee[] {
  const platform = getPlatform(config, settings.platformId)
  const resolved: ResolvedFee[] = []

  for (const fee of platform.fees) {
    if (fee.optional && !settings.enabledOptionalFeeIds.includes(fee.id)) continue

    if (fee.type === "flat") {
      resolved.push({
        id: fee.id,
        label: fee.label,
        kind: "flat",
        rate: 0,
        amount: fee.amount ?? 0,
        cap: null,
        verified: fee.verified,
        missing: fee.amount === null,
      })
      continue
    }

    const dataRate = fee.type === "percent_by_category" ? (fee.rateByCategory?.[settings.categoryId] ?? null) : fee.rate
    const manualRate = settings.manualRates[fee.id]
    // 0% là giá trị hợp lệ người dùng đã nhập (miễn/khuyến mãi phí) — chỉ null mới là "chưa nhập".
    const rate = dataRate ?? (typeof manualRate === "number" && manualRate >= 0 ? manualRate : null)
    resolved.push({
      id: fee.id,
      label: fee.label,
      kind: "percent",
      rate: rate ?? 0,
      amount: 0,
      cap: fee.cap,
      verified: fee.verified,
      missing: rate === null,
    })
  }
  return resolved
}

/** Chế độ 1 — bóc tách phí tại một mức giá bán cụ thể. */
export function breakdown(
  input: CalcSettings & { costPrice: number; sellPrice: number },
  config: FeeConfig,
): Receipt {
  const P = input.sellPrice
  const fees = resolveActiveFees(input, config)
  const missingRateFeeIds = fees.filter((f) => f.missing).map((f) => f.id)
  const active = fees.filter((f) => !f.missing)

  const lines: ReceiptLine[] = []
  let platformTotal = 0

  for (const fee of active) {
    if (fee.kind === "flat") {
      const amount = Math.round(fee.amount)
      platformTotal += amount
      lines.push({ id: fee.id, label: fee.label, amount, kind: "fee", verified: fee.verified })
      continue
    }
    const raw = Math.round(P * fee.rate)
    const capped = fee.cap !== null && raw > fee.cap
    const amount = capped ? (fee.cap as number) : raw
    platformTotal += amount
    lines.push({
      id: fee.id,
      label: fee.label,
      amount,
      kind: "fee",
      capped,
      verified: fee.verified,
      note: capped ? `kịch trần ${formatVND(fee.cap as number)}` : `${formatPercent(fee.rate)} × ${formatVND(P)}`,
    })
  }

  const taxRate = input.taxEnabled ? config.tax.rate : 0
  const taxAmount = Math.round(P * taxRate)
  const packaging = Math.round(input.packagingCost)
  const returns = Math.round(input.returnRate * input.returnCostPerOrder)

  const payout = P - platformTotal - taxAmount - input.costPrice - packaging - returns

  const warnings: string[] = []
  if (P < input.costPrice) {
    warnings.push("Giá bán đang thấp hơn giá vốn — chắc chắn lỗ trước cả khi tính phí.")
  }

  return {
    sellPrice: P,
    lines,
    platformTotal,
    taxAmount,
    costPrice: input.costPrice,
    packagingCost: packaging,
    returnsReserve: returns,
    payout,
    netMarginPct: P > 0 ? payout / P : 0,
    status: payout > 0 ? "lai" : payout === 0 ? "hoa" : "lo",
    warnings,
    missingRateFeeIds,
  }
}

/**
 * Chế độ 2 — tìm giá bán tối thiểu đạt % lãi ròng mục tiêu m (trên giá bán).
 *
 * Vì phí % có trần nên không giải một phát được. Mỗi vòng: giả định một TẬP phí
 * đang kịch trần (phí kịch trần thành hằng số ở tử số, rate rời khỏi mẫu số),
 * giải P = (C + G + R + Σflat + Σtrần) / (1 − Σrate_chưa_trần − t − m), rồi đối
 * chiếu lại tập trần theo P vừa giải — lặp tới khi tập ổn định. Hai điểm tinh vi:
 * - Mẫu số ≤ 0 mà vẫn còn phí CÓ TRẦN chưa cố định → chưa chắc bất khả thi
 *   (phí trần ngừng ăn % khi P đủ lớn): cố định chúng ở trần rồi giải tiếp.
 *   Chỉ bất khả thi khi mẫu số ≤ 0 với toàn phí không trần.
 * - Sau khi 2 phí cùng vào trần, giá giải lại có thể tụt xuống dưới ngưỡng trần
 *   của phí nhỏ hơn — đối chiếu lại tập trần mỗi vòng để giá trả về là TỐI THIỂU.
 * Payout tăng đơn điệu theo P nên làm tròn LÊN bội 500đ bảo toàn lãi ≥ m;
 * lưới an toàn cuối cùng kiểm chứng bằng chính breakdown().
 */
export function reversePrice(
  input: CalcSettings & { costPrice: number; targetMargin: number },
  config: FeeConfig,
): ReverseResult {
  const { costPrice: C, targetMargin: m } = input

  if (!Number.isFinite(C) || C <= 0) {
    return { ok: false, error: { code: "invalid_input", message: "Hãy nhập giá vốn lớn hơn 0." } }
  }
  // m = 0 hợp lệ: chính là câu hỏi "giá hòa vốn tối thiểu là bao nhiêu?".
  if (!Number.isFinite(m) || m < 0 || m >= 1) {
    return { ok: false, error: { code: "invalid_input", message: "Hãy nhập % lãi từ 0 đến dưới 100." } }
  }

  const fees = resolveActiveFees(input, config)
  const missing = fees.filter((f) => f.missing)
  if (missing.length > 0) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: `Hãy nhập % cho: ${missing.map((f) => f.label).join(", ")}.`,
      },
    }
  }

  const t = input.taxEnabled ? config.tax.rate : 0
  const returns = Math.round(input.returnRate * input.returnCostPerOrder)
  const percentFees = fees.filter((f) => f.kind === "percent")
  const flatTotal = fees.filter((f) => f.kind === "flat").reduce((sum, f) => sum + Math.round(f.amount), 0)
  const fixedBase = C + Math.round(input.packagingCost) + returns + flatTotal

  let cappedIds = new Set<string>()
  let price = 0
  let iterations = 0

  for (let i = 0; i < 8; i++) {
    iterations = i + 1
    const uncapped = percentFees.filter((f) => !cappedIds.has(f.id))
    const sumRate = uncapped.reduce((sum, f) => sum + f.rate, 0)
    const denom = 1 - sumRate - t - m

    if (denom <= 0) {
      const cappable = uncapped.filter((f) => f.cap !== null)
      if (cappable.length === 0) {
        // Toàn phí không trần mà mẫu số vẫn ≤ 0 → thật sự bất khả thi.
        const baseline = percentFees.filter((f) => f.cap === null).reduce((sum, f) => sum + f.rate, 0) + t
        return {
          ok: false,
          error: {
            code: "infeasible",
            message: `Không tồn tại giá bán nào đạt mức lãi này: các phí không có trần + thuế đã chiếm ${formatPercent(
              baseline,
            )} giá bán, nên lãi ròng tối đa chỉ có thể tiến sát ${formatPercent(1 - baseline)}.`,
          },
        }
      }
      // Với P đủ lớn các phí có trần chắc chắn kịch trần — cố định rồi giải tiếp.
      for (const fee of cappable) cappedIds.add(fee.id)
      continue
    }

    const capTotal = percentFees
      .filter((f) => cappedIds.has(f.id))
      .reduce((sum, f) => sum + (f.cap as number), 0)
    price = (fixedBase + capTotal) / denom

    // Đối chiếu tập trần với giá vừa giải; ổn định thì dừng.
    const shouldCap = new Set(
      percentFees.filter((f) => f.cap !== null && price * f.rate > f.cap).map((f) => f.id),
    )
    if (shouldCap.size === cappedIds.size && [...shouldCap].every((id) => cappedIds.has(id))) break
    cappedIds = shouldCap
  }

  let rounded = roundUpTo(price, 500)
  let receipt = breakdown({ ...input, sellPrice: rounded }, config)
  // Lưới an toàn tuyệt đối: nếu ca kỳ dị nào đó khiến lãi tại giá làm tròn vẫn
  // hụt mục tiêu, nhích từng nấc 500đ (payout đơn điệu tăng nên luôn tới đích).
  for (let bump = 0; bump < 200 && receipt.netMarginPct < m; bump++) {
    rounded += 500
    receipt = breakdown({ ...input, sellPrice: rounded }, config)
  }

  return { ok: true, price: rounded, iterations, receipt }
}
