import rawFees from "../data/fees.json"

/**
 * Toàn bộ biểu phí nằm trong src/data/fees.json — code không hardcode con số phí nào.
 * File này định nghĩa schema + type guard: fees.json sửa sai cấu trúc là build/test đỏ ngay,
 * kèm thông báo chỉ đúng chỗ lỗi để người sửa data (không phải dev) cũng lần ra được.
 */

export type FeeType = "percent" | "flat" | "percent_by_category"

export interface FeeDef {
  id: string
  label: string
  type: FeeType
  /** Phân số (0.06 = 6%) cho type "percent". null = chưa có số, người dùng tự nhập. */
  rate: number | null
  /** % theo từng ngành cho type "percent_by_category". Giá trị null = người dùng tự nhập. */
  rateByCategory?: Record<string, number | null>
  /** Số tiền VND cho type "flat". */
  amount: number | null
  /** Trần tiền VND cho phí %, null nếu không có trần. */
  cap: number | null
  /** Gói dịch vụ bật/tắt được (Freeship Xtra...). */
  optional: boolean
  effectiveFrom: string | null
  verified: boolean
  sourceUrl: string | null
  hint?: string
}

export interface PlatformCategory {
  id: string
  label: string
}

export interface Platform {
  id: string
  label: string
  categories: PlatformCategory[]
  fees: FeeDef[]
}

export interface TaxConfig {
  id: string
  label: string
  rate: number
  verified: boolean
  sourceUrl: string | null
}

export interface FeeConfig {
  lastUpdated: string
  tax: TaxConfig
  platforms: Platform[]
}

function fail(path: string, expected: string): never {
  throw new Error(`fees.json không hợp lệ: "${path}" phải là ${expected}.`)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function checkString(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) fail(path, "chuỗi không rỗng")
  return v
}

function checkBoolean(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") fail(path, "true hoặc false")
  return v
}

function checkNumberOrNull(v: unknown, path: string): number | null {
  if (v === null) return null
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) fail(path, "số ≥ 0 hoặc null")
  return v
}

function checkStringOrNull(v: unknown, path: string): string | null {
  if (v === null) return null
  if (typeof v !== "string") fail(path, "chuỗi hoặc null")
  return v
}

function checkFee(v: unknown, path: string): FeeDef {
  if (!isRecord(v)) fail(path, "một object phí")
  const type = checkString(v.type, `${path}.type`)
  if (type !== "percent" && type !== "flat" && type !== "percent_by_category") {
    fail(`${path}.type`, `"percent", "flat" hoặc "percent_by_category"`)
  }
  const fee: FeeDef = {
    id: checkString(v.id, `${path}.id`),
    label: checkString(v.label, `${path}.label`),
    type,
    rate: checkNumberOrNull(v.rate, `${path}.rate`),
    amount: checkNumberOrNull(v.amount, `${path}.amount`),
    cap: checkNumberOrNull(v.cap, `${path}.cap`),
    optional: checkBoolean(v.optional, `${path}.optional`),
    effectiveFrom: checkStringOrNull(v.effectiveFrom, `${path}.effectiveFrom`),
    verified: checkBoolean(v.verified, `${path}.verified`),
    sourceUrl: checkStringOrNull(v.sourceUrl, `${path}.sourceUrl`),
  }
  if (fee.rate !== null && fee.rate > 1) fail(`${path}.rate`, "phân số ≤ 1 (ví dụ 6% ghi là 0.06)")
  if (v.hint !== undefined) fee.hint = checkString(v.hint, `${path}.hint`)
  if (type === "percent_by_category") {
    if (!isRecord(v.rateByCategory)) fail(`${path}.rateByCategory`, "object { ngành: % hoặc null }")
    const map: Record<string, number | null> = {}
    for (const [catId, rate] of Object.entries(v.rateByCategory)) {
      const checked = checkNumberOrNull(rate, `${path}.rateByCategory.${catId}`)
      if (checked !== null && checked > 1) {
        fail(`${path}.rateByCategory.${catId}`, "phân số ≤ 1 (ví dụ 4% ghi là 0.04)")
      }
      map[catId] = checked
    }
    fee.rateByCategory = map
  }
  if (type === "flat" && fee.amount === null) fail(`${path}.amount`, "số tiền VND cho phí flat")
  return fee
}

function checkPlatform(v: unknown, path: string): Platform {
  if (!isRecord(v)) fail(path, "một object sàn")
  if (!Array.isArray(v.categories)) fail(`${path}.categories`, "mảng ngành hàng")
  if (!Array.isArray(v.fees)) fail(`${path}.fees`, "mảng phí")
  const categories = v.categories.map((c, i) => {
    if (!isRecord(c)) fail(`${path}.categories[${i}]`, "object { id, label }")
    return {
      id: checkString(c.id, `${path}.categories[${i}].id`),
      label: checkString(c.label, `${path}.categories[${i}].label`),
    }
  })
  const platform: Platform = {
    id: checkString(v.id, `${path}.id`),
    label: checkString(v.label, `${path}.label`),
    categories,
    fees: v.fees.map((f, i) => checkFee(f, `${path}.fees[${i}]`)),
  }
  // Phí theo ngành phải khai đủ % (hoặc null) cho từng ngành của sàn.
  for (const fee of platform.fees) {
    if (fee.type !== "percent_by_category") continue
    for (const cat of categories) {
      if (!(cat.id in (fee.rateByCategory ?? {}))) {
        fail(`${path}.fees(id=${fee.id}).rateByCategory.${cat.id}`, "khai báo (số hoặc null) cho ngành này")
      }
    }
  }
  return platform
}

export function assertFeeConfig(raw: unknown): FeeConfig {
  if (!isRecord(raw)) fail("(gốc)", "một object")
  if (!isRecord(raw.tax)) fail("tax", "object thuế")
  if (!Array.isArray(raw.platforms) || raw.platforms.length === 0) {
    fail("platforms", "mảng có ít nhất một sàn")
  }
  const taxRate = checkNumberOrNull(raw.tax.rate, "tax.rate")
  if (taxRate === null || taxRate > 1) fail("tax.rate", "phân số ≤ 1 (1,5% ghi là 0.015)")
  return {
    lastUpdated: checkString(raw.lastUpdated, "lastUpdated"),
    tax: {
      id: checkString(raw.tax.id, "tax.id"),
      label: checkString(raw.tax.label, "tax.label"),
      rate: taxRate,
      verified: checkBoolean(raw.tax.verified, "tax.verified"),
      sourceUrl: checkStringOrNull(raw.tax.sourceUrl, "tax.sourceUrl"),
    },
    platforms: raw.platforms.map((p, i) => checkPlatform(p, `platforms[${i}]`)),
  }
}

/** Biểu phí đã validate — nguồn duy nhất cho toàn app. */
export const FEES: FeeConfig = assertFeeConfig(rawFees)
