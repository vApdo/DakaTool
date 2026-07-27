/**
 * Class dùng chung cho giao diện module công trình — tối ưu cho điện thoại.
 *
 * Hai quy tắc quan trọng khi dùng ngoài công trường:
 *  1. Ô nhập phải ≥16px trên mobile, nếu không Safari iOS TỰ PHÓNG TO trang mỗi
 *     lần chạm vào ô (người dùng phải thu nhỏ lại thủ công sau mỗi lần nhập).
 *     Từ 640px trở lên mới thu về 14px cho gọn.
 *  2. Vùng chạm tối thiểu 44×44px — tay đeo găng, nắng chói, bấm nhầm nút xoá là
 *     mất dữ liệu.
 */

/** Ô nhập/textarea/select: 16px trên mobile → hết bị iOS zoom. */
export const INPUT =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-base " +
  "focus:border-primary focus:outline-none dark:border-gray-700 sm:py-1.5 sm:text-sm"

/** Ô nhập số tiền: canh phải, chữ đều nhau để soát chữ số. */
export const INPUT_NUM = `${INPUT} text-right font-mono tabular-nums`

/** Nhãn nhỏ phía trên ô nhập. */
export const LABEL = "block text-xs font-medium text-gray-500"

/** Nút icon (xoá…) — đủ 44px vùng chạm dù icon chỉ 16px. */
export const ICON_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg " +
  "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"

/** Nút chính/phụ trên mobile: cao tối thiểu 44px. */
export const TAP = "min-h-[44px]"

/**
 * Thanh hành động dính đáy màn hình (chỉ mobile) — sửa xong ở giữa danh sách dài
 * không phải cuộn xuống cuối tìm nút Lưu.
 */
export const STICKY_BAR =
  "sticky bottom-0 z-10 -mx-4 -mb-4 mt-3 flex flex-wrap items-center gap-2 border-t " +
  "border-gray-200 bg-white px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.06)] " +
  "dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_-6px_16px_rgba(0,0,0,0.5)] " +
  "sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"

/** 2.500.000.000 — dấu chấm phân cách kiểu Việt Nam. */
export function groupDigits(n: number): string {
  return n.toLocaleString("vi-VN")
}

/** Chỉ giữ chữ số khi người dùng gõ (bỏ dấu chấm, khoảng trắng, chữ). */
export function parseDigits(s: string): number {
  const digits = s.replace(/[^0-9]/g, "")
  return digits ? Number.parseInt(digits, 10) : 0
}

/**
 * Đọc hiểu nhanh số tiền: "2,5 tỷ ₫" — soát bằng mắt xem có thừa/thiếu số 0 không.
 * Đây là chỗ dễ sai nhất khi gõ 10 chữ số trên bàn phím điện thoại.
 */
export function humanVnd(n: number): string {
  if (n === 0) return "0 ₫"
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000
    return `≈ ${v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ ₫`
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `≈ ${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu ₫`
  }
  if (n >= 1_000) {
    return `≈ ${(n / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} nghìn ₫`
  }
  return `${groupDigits(n)} ₫`
}
