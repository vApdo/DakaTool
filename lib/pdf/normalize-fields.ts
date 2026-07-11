import type { FreightType, ReleaseType } from "./types"

/** Gộp mọi khoảng trắng liên tiếp (space, tab, NBSP) về một space và trim. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/[\s ]+/g, " ").trim()
}

/** Chuẩn hóa line break về "\n", bỏ dòng trống thừa ở đầu/cuối. */
export function normalizeLineBreaks(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line, i, arr) => line !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .trim()
}

export interface ParsedContainer {
  containerNo: string
  containerType: string
  sealNo: string
  packages: string
  packageType: string
  grossWeight: string
  cbm: string
}

// Số container theo ISO 6346: 4 chữ cái (chữ thứ 4 thường là U/J/Z) + 7 chữ số.
const CONTAINER_NO_RE = /\b([A-Z]{4}\d{7})\b/

// "2SKIDS" hoặc "2 SKIDS" → số kiện + loại kiện.
const PACKAGES_RE = /^(\d+)\s*([A-Z]+.*)$/i

// "140.000KGS" / "140.000 KGS" / "1,234.5 KGM" → tách số và đơn vị.
const WEIGHT_RE = /^([\d.,]+)\s*(KGS?|KGM|LBS?)\b/i

// "2.6110CBM" / "2.6110 CBM" / "2.61 M3".
const CBM_RE = /^([\d.,]+)\s*(CBM|M3|M³)\b/i

/**
 * Tách chuỗi container dạng:
 *   WHSU8729485 / 40'HQ / WHLY064496 / 2SKIDS / 140.000KGS / 2.6110CBM
 * Các phần được nhận diện theo pattern (không theo vị trí cứng) để chịu được
 * việc thiếu/đảo một vài phần giữa các form khác nhau.
 */
export function parseContainerString(raw: string): ParsedContainer | null {
  const text = normalizeWhitespace(raw)
  if (!CONTAINER_NO_RE.test(text)) return null

  const result: ParsedContainer = {
    containerNo: "",
    containerType: "",
    sealNo: "",
    packages: "",
    packageType: "",
    grossWeight: "",
    cbm: "",
  }

  const parts = text.split("/").map((p) => normalizeWhitespace(p))
  for (const part of parts) {
    if (!part) continue
    const containerMatch = part.match(CONTAINER_NO_RE)
    const weightMatch = part.match(WEIGHT_RE)
    const cbmMatch = part.match(CBM_RE)
    const packagesMatch = part.match(PACKAGES_RE)

    if (containerMatch && !result.containerNo) {
      result.containerNo = containerMatch[1]
    } else if (cbmMatch && !result.cbm) {
      result.cbm = `${cbmMatch[1]} ${cbmMatch[2].toUpperCase()}`
    } else if (weightMatch && !result.grossWeight) {
      result.grossWeight = `${weightMatch[1]} ${weightMatch[2].toUpperCase()}`
    } else if (/^\d+'?\s?[A-Z]{1,3}$/i.test(part) && !result.containerType) {
      // Loại container: 40'HQ, 20'GP, 40HC...
      result.containerType = part.toUpperCase()
    } else if (packagesMatch && !result.packages) {
      result.packages = packagesMatch[1]
      result.packageType = packagesMatch[2].toUpperCase()
    } else if (/^[A-Z]{2,4}\d{5,}$/i.test(part) && !result.sealNo) {
      // Seal no: chữ + số nhưng không khớp pattern container (đã bắt ở trên).
      result.sealNo = part.toUpperCase()
    }
  }

  return result
}

/**
 * Quy tắc nghiệp vụ Release Type:
 * TELEX RELEASE / SURRENDER → SURRENDER; SEA WAYBILL / WAYBILL / EXPRESS B/L → WAYBILL;
 * ORIGINAL (không kèm telex) → ORIGINAL.
 */
export function detectReleaseType(fullText: string): { value: ReleaseType; sourceText?: string } {
  const text = fullText.toUpperCase()
  const telex = text.match(/TELEX\s*RELEASE|SURRENDER(?:ED)?/)
  if (telex) return { value: "SURRENDER", sourceText: telex[0] }
  const waybill = text.match(/SEA\s*WAYBILL|EXPRESS\s*B\/?L|WAYBILL/)
  if (waybill) return { value: "WAYBILL", sourceText: waybill[0] }
  const original = text.match(/ORIGINAL/)
  if (original) return { value: "ORIGINAL", sourceText: original[0] }
  return { value: "UNKNOWN" }
}

/** Quy tắc nghiệp vụ Freight Type: FREIGHT PREPAID → PREPAID; FREIGHT COLLECT → COLLECT. */
export function detectFreightType(fullText: string): { value: FreightType; sourceText?: string } {
  const text = fullText.toUpperCase()
  const prepaid = text.match(/FREIGHT\s*PREPAID/)
  if (prepaid) return { value: "PREPAID", sourceText: prepaid[0] }
  const collect = text.match(/FREIGHT\s*COLLECT/)
  if (collect) return { value: "COLLECT", sourceText: collect[0] }
  return { value: "UNKNOWN" }
}

// Ngày dạng "28-JUN-2026", "28 JUN 2026", "28/06/2026", "JUN 28, 2026".
const DATE_PATTERNS = [
  /\b(\d{1,2}[-\s][A-Z]{3}[-\s,.]?\s?\d{4})\b/i,
  /\b([A-Z]{3,9}\.?\s\d{1,2},?\s\d{4})\b/i,
  /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b/,
]

/** Tìm ngày Shipped on Board: ưu tiên ngày đứng cạnh cụm "SHIPPED ON BOARD". */
export function detectShippedOnBoardDate(fullText: string): { value: string; sourceText?: string } {
  const text = fullText.toUpperCase()
  const nearby = text.match(/SHIPPED\s+ON\s+BOARD[:\s]*([^\n]{0,40})/)
  if (nearby) {
    for (const pattern of DATE_PATTERNS) {
      const m = nearby[1].match(pattern)
      if (m) return { value: normalizeWhitespace(m[1]), sourceText: normalizeWhitespace(nearby[0]) }
    }
  }
  return { value: "" }
}

/** Tìm HS Code: cụm "HS CODE" theo sau là 4–10 chữ số (có thể có dấu chấm). */
export function detectHsCode(fullText: string): { value: string; sourceText?: string } {
  const m = fullText.toUpperCase().match(/H\.?S\.?\s*CODE[:.\s]*([\d.]{4,12})/)
  if (m) return { value: m[1].replace(/\.$/, ""), sourceText: normalizeWhitespace(m[0]) }
  return { value: "" }
}
