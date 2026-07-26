import { useEffect, useState } from "react"

interface PercentInputProps {
  id: string
  label: React.ReactNode
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  placeholder?: string
}

/** "9,5" / "9.5" / "9," / "9" → số %; rỗng hoặc không đọc được → null. */
function parsePercentText(text: string): number | null {
  const normalized = text.replace(",", ".")
  if (normalized === "" || normalized === ".") return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.min(100, parsed) : null
}

function textFromValue(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",")
}

/**
 * Ô nhập % (0–100, cho phép lẻ thập phân, chấp nhận cả dấu phẩy kiểu Việt).
 * Chuỗi đang gõ giữ ở state cục bộ: ký tự dở dang như "9," phải sống sót qua
 * re-render — nếu điều khiển thẳng bằng số, React sẽ nuốt dấu phẩy và "9,5"
 * âm thầm thành 95 (sai 10 lần, lỗi đã tái hiện thật).
 * Giá trị trong state cha là số người dùng thấy (3 = 3%), calc mới đổi sang phân số.
 */
export function PercentInput({ id, label, value, onChange, hint, placeholder }: PercentInputProps) {
  const [text, setText] = useState(() => textFromValue(value))

  // Đồng bộ khi giá trị đổi từ BÊN NGOÀI (đổi sàn/ngành reset về null...).
  // Khi text hiện tại đã parse ra đúng value thì giữ nguyên chuỗi người dùng đang gõ.
  useEffect(() => {
    if (parsePercentText(text) !== value) setText(textFromValue(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Giữ chữ số + tối đa MỘT dấu phân cách, tối đa 2 số lẻ.
    let raw = e.target.value.replace(/[^0-9.,]/g, "")
    const sep = raw.search(/[.,]/)
    if (sep !== -1) {
      raw = raw.slice(0, sep + 1) + raw.slice(sep + 1).replace(/[.,]/g, "")
      raw = raw.slice(0, sep + 3)
    }
    const numeric = Number(raw.replace(",", "."))
    if (Number.isFinite(numeric) && numeric > 100) raw = "100"
    setText(raw)
    onChange(parsePercentText(raw))
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-affix">
        <input
          id={id}
          className="text-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          maxLength={6}
          placeholder={placeholder ?? "0"}
          value={text}
          onChange={handleChange}
        />
        <span className="input-suffix" aria-hidden="true">
          %
        </span>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
