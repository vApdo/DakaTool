import type { Receipt as ReceiptData, ReceiptLine as ReceiptLineData } from "../lib/calc"
import { formatPercent, formatVND, groupDigits } from "../lib/money"

/**
 * Dải giấy in nhiệt — vỏ chung cho phiếu thật, phiếu trống và phiếu lỗi.
 * Ref chụp PNG đặt ở wrapper (không phải mặt giấy) để răng cưa — vẽ bằng
 * pseudo-element tràn ra ngoài mặt giấy — nằm trọn trong khung ảnh.
 */
export function ReceiptPaper({
  children,
  innerRef,
}: {
  children: React.ReactNode
  innerRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div className="receipt-wrap" ref={innerRef}>
      <div className="receipt">{children}</div>
    </div>
  )
}

function ReceiptLine({ line }: { line: ReceiptLineData }) {
  // "chưa xác minh*" đi cùng dòng diễn giải, màu mực mờ — đỏ chỉ dành cho trạng thái LỖ.
  const note = [line.note, line.verified ? null : "chưa xác minh*"].filter(Boolean).join(" · ")
  return (
    <div className="rl">
      <span className="rl-label">
        {line.label}
        {note && <span className="rl-note">{note}</span>}
      </span>
      <span className="rl-amount">-{groupDigits(line.amount)}</span>
    </div>
  )
}

interface ReceiptProps {
  receipt: ReceiptData
  platformLabel: string
  categoryLabel: string
  taxRate: number
  taxVerified: boolean
  lastUpdated: string
  /** Ghi chú của dự phòng hoàn, vd "3% × 30.000đ". */
  returnsNote?: string
  /** Chế độ 2: giá bán tối thiểu + % lãi mục tiêu. */
  reverse?: { price: number; targetPct: number }
  innerRef?: React.Ref<HTMLDivElement>
}

const STATUS_LABEL = { lai: "Lãi", hoa: "Hòa vốn", lo: "Lỗ" } as const

/** Phiếu bóc tách — trình bày như biên lai in nhiệt để seller tin con số. */
export function Receipt({
  receipt,
  platformLabel,
  categoryLabel,
  taxRate,
  taxVerified,
  lastUpdated,
  returnsNote,
  reverse,
  innerRef,
}: ReceiptProps) {
  const hasUnverified = receipt.lines.some((l) => !l.verified) || (receipt.taxAmount > 0 && !taxVerified)

  return (
    <ReceiptPaper innerRef={innerRef}>
      <header className="receipt-header">
        <p className="receipt-brand">TÍNH LÃI THẬT</p>
        <p className="receipt-sub">
          Phiếu ước tính · {platformLabel} · {categoryLabel}
        </p>
        <p className="receipt-sub">Biểu phí cập nhật: {lastUpdated}</p>
      </header>

      {reverse && (
        <>
          <hr className="tear" />
          <div className="receipt-answer">
            <p className="receipt-answer-label">Giá bán tối thiểu</p>
            <p className="receipt-answer-value">{formatVND(reverse.price)}</p>
            <p className="receipt-margin">để lãi ròng từ {String(reverse.targetPct).replace(".", ",")}% trở lên</p>
          </div>
        </>
      )}

      <hr className="tear" />

      <div className="rl">
        <span className="rl-label">{reverse ? "Giá bán (chứng minh)" : "Giá bán"}</span>
        <span className="rl-amount">{groupDigits(receipt.sellPrice)}</span>
      </div>

      <hr className="tear" />

      {receipt.lines.map((line) => (
        <ReceiptLine key={line.id} line={line} />
      ))}
      <div className="rl rl-total">
        <span className="rl-label">SÀN GIỮ LẠI</span>
        <span className="rl-amount">-{groupDigits(receipt.platformTotal)}</span>
      </div>

      {receipt.taxAmount > 0 && (
        <div className="rl">
          <span className="rl-label">
            Thuế khấu trừ
            <span className="rl-note">
              {[`${formatPercent(taxRate)} × ${formatVND(receipt.sellPrice)}`, taxVerified ? null : "chưa xác minh*"]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="rl-amount">-{groupDigits(receipt.taxAmount)}</span>
        </div>
      )}

      <hr className="tear" />

      <div className="rl">
        <span className="rl-label">Giá vốn</span>
        <span className="rl-amount">-{groupDigits(receipt.costPrice)}</span>
      </div>
      <div className="rl">
        <span className="rl-label">Đóng gói</span>
        <span className="rl-amount">-{groupDigits(receipt.packagingCost)}</span>
      </div>
      <div className="rl">
        <span className="rl-label">
          Dự phòng đơn hoàn
          {returnsNote && <span className="rl-note">{returnsNote}</span>}
        </span>
        <span className="rl-amount">-{groupDigits(receipt.returnsReserve)}</span>
      </div>

      <hr className="tear" />

      <div className="receipt-payout">
        <p className="receipt-payout-label">Tiền về tay / đơn</p>
        <p className={`receipt-payout-value${receipt.status === "lo" ? " is-lo" : ""}`}>
          {formatVND(receipt.payout)}
        </p>
        <p className="receipt-margin">Lãi ròng trên giá bán: {formatPercent(receipt.netMarginPct)}</p>
        <span className={`stamp is-${receipt.status}`}>{STATUS_LABEL[receipt.status]}</span>
        {receipt.status === "lo" && (
          <span className="stamp-note">Đang lỗ mỗi đơn {formatVND(Math.abs(receipt.payout))}</span>
        )}
      </div>

      {receipt.warnings.map((warning) => (
        <p key={warning} className="receipt-warning" role="alert">
          {warning}
        </p>
      ))}

      {hasUnverified && (
        <p className="receipt-footnote">
          * Chưa đối chiếu với thông báo chính thức của sàn — kiểm tra lại trong kênh người bán của bạn.
        </p>
      )}

      <p className="receipt-tool-line">Tính Lãi Thật — {typeof window !== "undefined" ? window.location.host : ""}</p>
    </ReceiptPaper>
  )
}
