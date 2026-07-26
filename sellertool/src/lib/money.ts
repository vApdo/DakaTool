/**
 * Tiện ích tiền tệ kiểu Việt. Tự cài đặt thay vì toLocaleString để kết quả
 * giống hệt nhau trên mọi môi trường (trình duyệt, Node trong CI).
 */

/** 1250000 → "1.250.000đ"; số âm → "-4.200đ". */
export function formatVND(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded < 0 ? "-" : ""
  return `${sign}${groupDigits(Math.abs(rounded))}đ`
}

/** 1250000 → "1.250.000" (không hậu tố — dùng trong ô nhập liệu). */
export function groupDigits(n: number): string {
  return Math.abs(Math.trunc(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** Chuỗi người dùng gõ ("1.250.000", "1250000", có thể lẫn ký tự) → số đồng, rỗng → null. */
export function parseVNDInput(input: string): number | null {
  const digits = input.replace(/\D/g, "")
  if (digits === "") return null
  const value = Number(digits)
  return Number.isSafeInteger(value) ? value : null
}

/** 0.0155 → "1,55%" — dấu phẩy thập phân kiểu Việt, tối đa 2 chữ số lẻ. */
export function formatPercent(fraction: number): string {
  const pct = Math.round(fraction * 10000) / 100
  return `${pct.toString().replace(".", ",")}%`
}

/** Làm tròn LÊN bội số step (giá bán an toàn). Bội đúng giữ nguyên. */
export function roundUpTo(n: number, step: number): number {
  // Trừ epsilon để sai số dấu phẩy động (183999.99999...) không đẩy oan lên nấc kế.
  return Math.ceil((n - 1e-6) / step) * step
}
