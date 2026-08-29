export interface PaymentRequestItem {
  id: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  note: string
}

export interface CompanyProfile {
  id: string
  name: string
  address: string
}

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: "a2s-accounting",
    name: "CÔNG TY TNHH DỊCH VỤ KẾ TOÁN Á CHÂU A2S",
    address: "Lô 787 KĐT Nam Vĩnh Yên – Vĩnh Phúc - Phú Thọ",
  },
  {
    id: "asia-group",
    name: "CÔNG TY TNHH TẬP ĐOÀN Á CHÂU ASIA GROUP",
    address: "Lô 787 KĐT Nam Vĩnh Yên – Vĩnh Yên - Phú Thọ",
  },
  {
    id: "hqt-technology",
    name: "CÔNG TY CỔ PHẦN KỸ THUẬT CÔNG NGHỆ HQT",
    address: "Cụm CN Làng nghề Minh Phương - Nguyệt Đức - Phú Thọ",
  },
]

export const DEFAULT_REQUESTERS = ["Nguyễn Đăng Vít", "Trần Thị Phương Thảo", "Bùi Thị Thúy Nga"]

export const DEFAULT_DEPARTMENTS = ["Kế hoạch & Tổng hợp", "Marketing", "HCNS"]

export function paymentRecipient(companyName: string): string {
  return `Ban lãnh đạo ${companyName.trim() || "công ty"}`
}

export interface PaymentRequestData {
  companyName: string
  companyAddress: string
  requestDate: string
  recipient: string
  requesterName: string
  department: string
  paymentContent: string
  items: PaymentRequestItem[]
}

export function calculateItemTotal(item: PaymentRequestItem): number {
  return Math.max(0, item.quantity || 0) * Math.max(0, item.unitPrice || 0)
}

export function calculatePaymentTotal(items: PaymentRequestItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value))
}

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
const GROUPS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]

function readThreeDigits(value: number, full: boolean): string {
  const hundred = Math.floor(value / 100)
  const ten = Math.floor((value % 100) / 10)
  const unit = value % 10
  const words: string[] = []

  if (hundred > 0 || full) {
    words.push(DIGITS[hundred], "trăm")
  }

  if (ten > 1) {
    words.push(DIGITS[ten], "mươi")
    if (unit === 1) words.push("mốt")
    else if (unit === 4) words.push("tư")
    else if (unit === 5) words.push("lăm")
    else if (unit > 0) words.push(DIGITS[unit])
  } else if (ten === 1) {
    words.push("mười")
    if (unit === 5) words.push("lăm")
    else if (unit > 0) words.push(DIGITS[unit])
  } else if (unit > 0) {
    if (hundred > 0 || full) words.push("lẻ")
    words.push(DIGITS[unit])
  }

  return words.join(" ")
}

export function numberToVietnameseWords(value: number): string {
  const rounded = Math.max(0, Math.round(value))
  if (rounded === 0) return "Không đồng chẵn"

  const groups: number[] = []
  let remaining = rounded
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const words: string[] = []
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index]
    if (group === 0) continue
    const needsFullReading = index < groups.length - 1 && group < 100
    words.push(readThreeDigits(group, needsFullReading))
    if (GROUPS[index]) words.push(GROUPS[index])
  }

  const sentence = words.join(" ").replace(/\s+/g, " ").trim()
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng chẵn`
}

export function formatVietnameseDate(dateValue: string): string {
  const parts = dateValue.split("-").map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return ""
  return `Ngày ${String(parts[2]).padStart(2, "0")} tháng ${String(parts[1]).padStart(2, "0")} năm ${parts[0]}`
}
