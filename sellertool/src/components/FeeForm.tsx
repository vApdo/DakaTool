import type { CalcFormAction, CalcFormState } from "../hooks/useCalcState"
import { FEES, type FeeDef } from "../lib/fees"
import { getPlatform } from "../lib/calc"
import { formatPercent, formatVND } from "../lib/money"
import { CategorySelect } from "./CategorySelect"
import { CurrencyInput } from "./CurrencyInput"
import { PercentInput } from "./PercentInput"
import { PlatformSelect } from "./PlatformSelect"
import { ToggleRow } from "./ToggleRow"

interface FeeFormProps {
  state: CalcFormState
  dispatch: React.Dispatch<CalcFormAction>
}

/** % trong data cho phí này với ngành đang chọn — null nghĩa là người dùng phải tự nhập. */
function dataRateFor(fee: FeeDef, categoryId: string): number | null {
  if (fee.type === "percent_by_category") return fee.rateByCategory?.[categoryId] ?? null
  return fee.rate
}

function optionalFeeSublabel(fee: FeeDef, categoryId: string): string {
  const rate = dataRateFor(fee, categoryId)
  if (rate === null) return "Bật rồi nhập % của chương trình bạn tham gia"
  const cap = fee.cap !== null ? `, trần ${formatVND(fee.cap)}` : ""
  return `${formatPercent(rate)} giá bán${cap}`
}

/** Toàn bộ form nhập liệu — trường hiện ra theo chế độ và theo sàn đang chọn. */
export function FeeForm({ state, dispatch }: FeeFormProps) {
  const platform = getPlatform(FEES, state.platformId)

  // Phí % chưa có số trong fees.json (tính cả gói optional đang bật) → cho nhập tay,
  // để tool vẫn dùng được ngay cả khi dữ liệu chưa đầy đủ.
  const manualRateFees = platform.fees.filter((fee) => {
    if (fee.type === "flat") return false
    if (fee.optional && !state.enabledOptionalFeeIds.includes(fee.id)) return false
    return dataRateFor(fee, state.categoryId) === null
  })

  const optionalFees = platform.fees.filter((fee) => fee.optional)

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <section className="form-section" aria-label="Sàn và sản phẩm">
        <h2 className="form-section-title">Sàn &amp; sản phẩm</h2>
        <div className="field">
          <PlatformSelect
            platforms={FEES.platforms}
            value={state.platformId}
            onChange={(platformId) => dispatch({ type: "set_platform", platformId })}
          />
        </div>
        <CategorySelect
          categories={platform.categories}
          value={state.categoryId}
          onChange={(categoryId) => dispatch({ type: "set_category", categoryId })}
        />

        <CurrencyInput
          id="cost-price"
          label="Giá vốn"
          value={state.costPrice}
          onChange={(value) => dispatch({ type: "set_field", field: "costPrice", value })}
          quickAdds={[1000, 10000]}
          placeholder="120.000"
        />

        {state.mode === "breakdown" ? (
          <CurrencyInput
            id="sell-price"
            label="Giá bán dự kiến"
            value={state.sellPrice}
            onChange={(value) => dispatch({ type: "set_field", field: "sellPrice", value })}
            quickAdds={[1000, 10000]}
            placeholder="200.000"
          />
        ) : (
          <PercentInput
            id="target-margin"
            label="Lãi ròng mong muốn"
            value={state.targetMarginPct}
            onChange={(value) => dispatch({ type: "set_field", field: "targetMarginPct", value })}
            hint="Tính trên giá bán — ví dụ 20 nghĩa là cứ 100.000đ doanh thu, về tay 20.000đ."
            placeholder="20"
          />
        )}
      </section>

      {manualRateFees.length > 0 && (
        <section className="form-section" aria-label="Phí cần tự nhập">
          <h2 className="form-section-title">% phí của bạn</h2>
          {manualRateFees.map((fee) => (
            <PercentInput
              key={fee.id}
              id={`manual-rate-${fee.id}`}
              label={fee.label}
              value={state.manualRatesPct[fee.id] ?? null}
              onChange={(value) => dispatch({ type: "set_manual_rate", feeId: fee.id, value })}
              hint={fee.hint ?? "Xem % chính xác trong kênh người bán của bạn"}
              placeholder="4"
            />
          ))}
        </section>
      )}

      {optionalFees.length > 0 && (
        <section className="form-section" aria-label="Gói dịch vụ của sàn">
          <h2 className="form-section-title">Gói dịch vụ đang tham gia</h2>
          {optionalFees.map((fee) => (
            <ToggleRow
              key={fee.id}
              label={fee.label}
              sublabel={optionalFeeSublabel(fee, state.categoryId)}
              checked={state.enabledOptionalFeeIds.includes(fee.id)}
              onChange={() => dispatch({ type: "toggle_fee", feeId: fee.id })}
            />
          ))}
        </section>
      )}

      <section className="form-section" aria-label="Chi phí của shop">
        <details className="extra-costs">
          <summary>Chi phí của shop (đóng gói, đơn hoàn)</summary>
          <div className="extra-costs-body">
            <CurrencyInput
              id="packaging-cost"
              label="Phí đóng gói mỗi đơn"
              value={state.packagingCost}
              onChange={(value) => dispatch({ type: "set_field", field: "packagingCost", value })}
              quickAdds={[500, 1000]}
            />
            <PercentInput
              id="return-rate"
              label="% đơn hoàn dự kiến"
              value={state.returnRatePct}
              onChange={(value) => dispatch({ type: "set_field", field: "returnRatePct", value })}
              hint="Cứ 100 đơn thì mấy đơn bị hoàn/bom?"
            />
            <CurrencyInput
              id="return-cost"
              label="Chi phí mất mỗi đơn hoàn"
              value={state.returnCostPerOrder}
              onChange={(value) => dispatch({ type: "set_field", field: "returnCostPerOrder", value })}
              quickAdds={[5000, 10000]}
              hint="Ship 2 chiều, hàng hỏng... — tính bình quân."
            />
          </div>
        </details>
      </section>

      <section className="form-section" aria-label="Thuế">
        <ToggleRow
          label="Tôi là hộ/cá nhân kinh doanh"
          sublabel={`Sàn khấu trừ ${formatPercent(FEES.tax.rate)} doanh thu (1% GTGT + 0,5% TNCN)`}
          checked={state.taxEnabled}
          onChange={() => dispatch({ type: "toggle_tax" })}
        />
      </section>
    </form>
  )
}
