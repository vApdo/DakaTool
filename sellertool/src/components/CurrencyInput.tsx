import { useRef } from "react"
import { formatVND, groupDigits, parseVNDInput } from "../lib/money"

interface CurrencyInputProps {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
  /** Nút cộng nhanh, vd [1000, 10000] → "+1.000" "+10.000". */
  quickAdds?: number[]
  placeholder?: string
  hint?: string
}

/** Vị trí caret trong chuỗi đã format sao cho đứng sau chữ số thứ digitCount. */
function caretFromDigits(text: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] >= "0" && text[i] <= "9") {
      seen++
      if (seen === digitCount) return i + 1
    }
  }
  return text.length
}

/**
 * Ô nhập tiền kiểu Việt: bàn phím số trên điện thoại, format 1.250.000 ngay khi gõ
 * (giữ đúng vị trí con trỏ theo số chữ số đứng trước), kèm nút cộng nhanh.
 */
export function CurrencyInput({ id, label, value, onChange, quickAdds, placeholder, hint }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target
    const digitsBeforeCaret = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length
    const parsed = parseVNDInput(el.value)
    const formatted = parsed === null ? "" : groupDigits(parsed)
    // Ghi thẳng chuỗi đã format vào DOM để ký tự rác không bao giờ hiển thị,
    // rồi đặt lại caret theo số chữ số phía trước nó.
    el.value = formatted
    const caret = caretFromDigits(formatted, digitsBeforeCaret)
    el.setSelectionRange(caret, caret)
    onChange(parsed)
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-affix">
        <input
          ref={inputRef}
          id={id}
          className="text-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={15}
          placeholder={placeholder ?? "0"}
          value={value === null ? "" : groupDigits(value)}
          onChange={handleChange}
        />
        <span className="input-suffix" aria-hidden="true">
          đ
        </span>
      </div>
      {quickAdds && quickAdds.length > 0 && (
        <div className="quick-adds">
          {quickAdds.map((step) => (
            <button
              key={step}
              type="button"
              className="quick-add"
              aria-label={`Cộng thêm ${formatVND(step)} vào ${label}`}
              onClick={() => {
                onChange((value ?? 0) + step)
                inputRef.current?.focus()
              }}
            >
              +{groupDigits(step)}
            </button>
          ))}
        </div>
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
