import { useRef } from "react"
import { FeeForm } from "./components/FeeForm"
import { Footer } from "./components/Footer"
import { ModeTabs } from "./components/ModeTabs"
import { Receipt, ReceiptPaper } from "./components/Receipt"
import { SaveReceiptButton } from "./components/SaveReceiptButton"
import { useCalcState } from "./hooks/useCalcState"
import { breakdown, getPlatform, reversePrice, type CalcSettings } from "./lib/calc"
import { FEES } from "./lib/fees"
import { formatVND } from "./lib/money"

/** "2026-07-26" → "26/07/2026". */
function formatDateVN(iso: string): string {
  return iso.split("-").reverse().join("/")
}

export default function App() {
  const [state, dispatch] = useCalcState()
  const receiptRef = useRef<HTMLDivElement>(null)

  const platform = getPlatform(FEES, state.platformId)
  const categoryLabel = platform.categories.find((c) => c.id === state.categoryId)?.label ?? ""
  const lastUpdated = formatDateVN(FEES.lastUpdated)

  // % trong form là số người dùng thấy (4 = 4%) — đổi sang phân số khi đưa vào calc.
  const settings: CalcSettings = {
    platformId: state.platformId,
    categoryId: state.categoryId,
    enabledOptionalFeeIds: state.enabledOptionalFeeIds,
    // 0% là giá trị hợp lệ (phí được miễn) — chỉ ô còn trống (null) mới bị loại.
    manualRates: Object.fromEntries(
      Object.entries(state.manualRatesPct).flatMap(([feeId, pct]) =>
        pct !== null && pct >= 0 ? [[feeId, pct / 100]] : [],
      ),
    ),
    packagingCost: state.packagingCost ?? 0,
    returnRate: (state.returnRatePct ?? 0) / 100,
    returnCostPerOrder: state.returnCostPerOrder ?? 0,
    taxEnabled: state.taxEnabled,
  }

  const returnsNote =
    state.returnRatePct !== null && state.returnCostPerOrder !== null
      ? `${String(state.returnRatePct).replace(".", ",")}% × ${formatVND(state.returnCostPerOrder)}`
      : undefined

  const receiptProps = {
    platformLabel: platform.label,
    categoryLabel,
    taxRate: FEES.tax.rate,
    taxVerified: FEES.tax.verified,
    lastUpdated,
    returnsNote,
  }

  let panel: React.ReactNode
  let hasReceipt = false

  if (state.mode === "breakdown") {
    if (state.costPrice === null || state.sellPrice === null || state.sellPrice <= 0) {
      panel = (
        <ReceiptPaper>
          <p className="receipt-empty">Nhập giá vốn và giá bán dự kiến — phiếu bóc tách sẽ in ra ở đây.</p>
        </ReceiptPaper>
      )
    } else {
      const receipt = breakdown({ ...settings, costPrice: state.costPrice, sellPrice: state.sellPrice }, FEES)
      if (receipt.missingRateFeeIds.length > 0) {
        const labels = platform.fees
          .filter((f) => receipt.missingRateFeeIds.includes(f.id))
          .map((f) => `"${f.label}"`)
          .join(", ")
        panel = (
          <ReceiptPaper>
            <p className="receipt-empty">Nhập % cho {labels} (mục "% phí của bạn") để in phiếu.</p>
          </ReceiptPaper>
        )
      } else {
        hasReceipt = true
        panel = <Receipt receipt={receipt} innerRef={receiptRef} {...receiptProps} />
      }
    }
  } else {
    if (state.costPrice === null || state.targetMarginPct === null) {
      panel = (
        <ReceiptPaper>
          <p className="receipt-empty">Nhập giá vốn và % lãi mong muốn — giá bán tối thiểu sẽ in ra ở đây.</p>
        </ReceiptPaper>
      )
    } else {
      const result = reversePrice(
        { ...settings, costPrice: state.costPrice, targetMargin: state.targetMarginPct / 100 },
        FEES,
      )
      if (!result.ok || !result.receipt || result.price === undefined) {
        panel = (
          <ReceiptPaper>
            <div className="receipt-error">
              <span className="stamp is-lo">Không ra giá</span>
              <p className="receipt-error-message" role="alert">
                {result.error?.message ?? "Không tính được — kiểm tra lại số liệu nhập vào."}
              </p>
            </div>
          </ReceiptPaper>
        )
      } else {
        hasReceipt = true
        panel = (
          <Receipt
            receipt={result.receipt}
            reverse={{ price: result.price, targetPct: state.targetMarginPct }}
            innerRef={receiptRef}
            {...receiptProps}
          />
        )
      }
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">
          Tính <span className="brand-accent">Lãi</span> Thật
        </h1>
        <p className="tagline">
          Trừ hết phí sàn và thuế — biết ngay mỗi đơn thực sự về tay bao nhiêu, và phải bán giá nào mới có lãi.
        </p>
        <p className="fees-updated">Biểu phí cập nhật: {lastUpdated}</p>
      </header>

      <main className="app-form">
        <ModeTabs mode={state.mode} onChange={(mode) => dispatch({ type: "set_mode", mode })} />
        <FeeForm state={state} dispatch={dispatch} />
      </main>

      {/* Không đặt aria-live lên cả panel: kết quả đổi theo TỪNG phím gõ, máy đọc
          màn hình sẽ đọc lại hàng chục dòng phí sau mỗi ký tự — nhiễu thay vì hỗ trợ. */}
      <section className="app-receipt" id="calc-panel" role="tabpanel" aria-labelledby={`tab-${state.mode}`}>
        {panel}
        <SaveReceiptButton targetRef={receiptRef} disabled={!hasReceipt} />
      </section>

      <Footer lastUpdated={lastUpdated} />
    </div>
  )
}
