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
    const rate = dataRate ?? (typeof manualRate === "number" && manualRate > 0 ? manualRate : null)
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
 * Vì phí % có trần nên không giải một phát được: vòng 1 bỏ qua trần
 * P = (C + G + R + Σflat) / (1 − Σrate − t − m); sau đó phí nào P×rate vượt trần
 * thì cố định = trần (chuyển sang tử số, loại rate khỏi mẫu số) rồi giải lại.
 * Mỗi vòng loại ít nhất một phí nên hội tụ trong ≤ 3 vòng với biểu phí thực tế.
 * Payout tăng đơn điệu theo P nên làm tròn LÊN bội 500đ vẫn bảo toàn lãi ≥ m.
 */
export function reversePrice(
  input: CalcSettings & { costPrice: number; targetMargin: number },
  config: FeeConfig,
): ReverseResult {
  const { costPrice: C, targetMargin: m } = input

  if (!Number.isFinite(C) || C <= 0) {
    return { ok: false, error: { code: "invalid_input", message: "Hãy nhập giá vốn lớn hơn 0." } }
  }
  if (!Number.isFinite(m) || m <= 0 || m >= 1) {
    return { ok: false, error: { code: "invalid_input", message: "Hãy nhập % lãi mong muốn trong khoảng 0–100%." } }
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
  const flatTotal = fees.filter((f) => f.kind === "flat").reduce((sum, f) => sum + Math.round(f.amount), 0)

  let fixed = C + Math.round(input.packagingCost) + returns + flatTotal
  let uncapped = fees.filter((f) => f.kind === "percent")
  let price = 0
  let iterations = 0

  for (let i = 0; i < 3; i++) {
    iterations = i + 1
    const sumRate = uncapped.reduce((sum, f) => sum + f.rate, 0)
    const denom = 1 - sumRate - t - m
    if (denom <= 0) {
      return {
        ok: false,
        error: {
          code: "infeasible",
          message: `Không tồn tại giá bán nào đạt mức lãi này: tổng phí + thuế đã chiếm ${formatPercent(
            sumRate + t,
          )} giá bán.`,
        },
      }
    }
    price = fixed / denom
    const hitCap = uncapped.filter((f) => f.cap !== null && price * f.rate > f.cap)
    if (hitCap.length === 0) break
    fixed += hitCap.reduce((sum, f) => sum + (f.cap as number), 0)
    uncapped = uncapped.filter((f) => !hitCap.includes(f))
  }

  const rounded = roundUpTo(price, 500)
  return {
    ok: true,
    price: rounded,
    iterations,
    receipt: breakdown({ ...input, sellPrice: rounded }, config),
  }
}
