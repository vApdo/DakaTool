interface PercentInputProps {
  id: string
  label: React.ReactNode
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  placeholder?: string
}

/**
 * Ô nhập % (0–100, cho phép lẻ thập phân, chấp nhận cả dấu phẩy kiểu Việt).
 * Giá trị trong state là số người dùng thấy (3 = 3%), calc mới đổi sang phân số.
 */
export function PercentInput({ id, label, value, onChange, hint, placeholder }: PercentInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "")
    if (cleaned === "" || cleaned === ".") {
      onChange(null)
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    onChange(Math.min(100, parsed))
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
          value={value === null ? "" : String(value).replace(".", ",")}
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
