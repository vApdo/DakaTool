import { useReducer } from "react"
import { FEES } from "../lib/fees"

export type Mode = "breakdown" | "reverse"

/**
 * Toàn bộ state của form gom về một reducer: ~12 field liên đới nhau
 * (đổi sàn phải reset ngành + gói + % nhập tay; hai chế độ dùng chung thiết lập).
 * Giá trị null = ô đang trống. Các % trong state là số người dùng thấy (3 = 3%),
 * chỉ đổi sang phân số khi đưa vào calc.
 */
export interface CalcFormState {
  mode: Mode
  platformId: string
  categoryId: string
  costPrice: number | null
  sellPrice: number | null
  targetMarginPct: number | null
  enabledOptionalFeeIds: string[]
  manualRatesPct: Record<string, number | null>
  packagingCost: number | null
  returnRatePct: number | null
  returnCostPerOrder: number | null
  taxEnabled: boolean
}

export type CalcFormAction =
  | { type: "set_mode"; mode: Mode }
  | { type: "set_platform"; platformId: string }
  | { type: "set_category"; categoryId: string }
  | {
      type: "set_field"
      field: "costPrice" | "sellPrice" | "targetMarginPct" | "packagingCost" | "returnRatePct" | "returnCostPerOrder"
      value: number | null
    }
  | { type: "toggle_fee"; feeId: string }
  | { type: "set_manual_rate"; feeId: string; value: number | null }
  | { type: "toggle_tax" }

export const initialCalcState: CalcFormState = {
  mode: "breakdown",
  platformId: FEES.platforms[0].id,
  categoryId: FEES.platforms[0].categories[0]?.id ?? "",
  costPrice: null,
  sellPrice: null,
  targetMarginPct: null,
  enabledOptionalFeeIds: [],
  manualRatesPct: {},
  // Mặc định theo spec: đóng gói 2.000đ, hoàn 3%, mất 30.000đ/đơn hoàn, thuế BẬT.
  packagingCost: 2000,
  returnRatePct: 3,
  returnCostPerOrder: 30000,
  taxEnabled: true,
}

export function calcFormReducer(state: CalcFormState, action: CalcFormAction): CalcFormState {
  switch (action.type) {
    case "set_mode":
      return { ...state, mode: action.mode }
    case "set_platform": {
      if (action.platformId === state.platformId) return state
      const platform = FEES.platforms.find((p) => p.id === action.platformId)
      if (!platform) return state
      // Sang sàn khác: ngành, gói dịch vụ và % nhập tay đều thuộc sàn cũ — reset hết.
      return {
        ...state,
        platformId: platform.id,
        categoryId: platform.categories[0]?.id ?? "",
        enabledOptionalFeeIds: [],
        manualRatesPct: {},
      }
    }
    case "set_category": {
      if (action.categoryId === state.categoryId) return state
      // % nhập tay cho phí THEO NGÀNH thuộc về ngành cũ — xóa khi đổi ngành,
      // kẻo biên lai ngành mới âm thầm tính bằng % của ngành trước.
      const platform = FEES.platforms.find((p) => p.id === state.platformId)
      const byCategoryFeeIds = new Set(
        (platform?.fees ?? []).filter((f) => f.type === "percent_by_category").map((f) => f.id),
      )
      const manualRatesPct = Object.fromEntries(
        Object.entries(state.manualRatesPct).filter(([feeId]) => !byCategoryFeeIds.has(feeId)),
      )
      return { ...state, categoryId: action.categoryId, manualRatesPct }
    }
    case "set_field":
      return { ...state, [action.field]: action.value }
    case "toggle_fee": {
      const enabled = state.enabledOptionalFeeIds.includes(action.feeId)
      return {
        ...state,
        enabledOptionalFeeIds: enabled
          ? state.enabledOptionalFeeIds.filter((id) => id !== action.feeId)
          : [...state.enabledOptionalFeeIds, action.feeId],
      }
    }
    case "set_manual_rate":
      return { ...state, manualRatesPct: { ...state.manualRatesPct, [action.feeId]: action.value } }
    case "toggle_tax":
      return { ...state, taxEnabled: !state.taxEnabled }
  }
}

export function useCalcState() {
  return useReducer(calcFormReducer, initialCalcState)
}
