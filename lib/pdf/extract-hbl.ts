import type {
  ExtractedField,
  FieldConfidence,
  HblExtractionResult,
  PageText,
  PositionedItem,
} from "./types"
import {
  detectFreightType,
  detectHsCode,
  detectReleaseType,
  detectShippedOnBoardDate,
  normalizeLineBreaks,
  normalizeWhitespace,
  parseContainerString,
} from "./normalize-fields"

/**
 * Trích xuất dữ liệu HBL từ text đã đọc được của PDF.
 *
 * Nhiều form HBL (như mẫu WAN HAI/Gebrüder Weiss) chỉ nhúng GIÁ TRỊ vào text layer,
 * còn nhãn trường nằm trong nền form — nên không thể chỉ dò theo nhãn.
 * Chiến lược ở đây gồm 2 lớp:
 *   1. Pattern toàn văn: container string, TELEX RELEASE, FREIGHT PREPAID, HS CODE, ngày SOB...
 *   2. Hình học: gom item theo dòng/cột (tọa độ pdf.js, gốc góc trái DƯỚI),
 *      suy ra các khối Shipper/Consignee/Notify ở cột trái từ trên xuống,
 *      hàng Vessel+Voyage / POL và hàng POD / Place of Delivery.
 */
export function extractHbl(pages: PageText[]): HblExtractionResult {
  // Trang có nhiều text nhất thường là trang mặt trước của B/L.
  const page = pages.reduce((best, p) => (charCount(p) > charCount(best) ? p : best), pages[0])
  const lines = groupIntoLines(page?.items ?? [])
  const fullText = normalizeLineBreaks(lines.map((l) => l.text).join("\n"))

  const result = emptyResult()

  applyFullTextPatterns(result, fullText)
  applyContainerLine(result, lines)
  applyLeftColumnBlocks(result, lines)
  applyVesselRouteRows(result, lines)
  applyBodyColumns(result, lines)
  applyHblNo(result, lines)

  return result
}

// ---------------------------------------------------------------------------
// Gom item rời rạc thành dòng theo tọa độ
// ---------------------------------------------------------------------------

interface Line {
  y: number
  items: PositionedItem[]
  text: string
}

const LINE_Y_TOLERANCE = 3

function groupIntoLines(items: PositionedItem[]): Line[] {
  const lines: Line[] = []
  const sorted = [...items]
    .filter((it) => it.text.trim() !== "")
    .sort((a, b) => b.y - a.y || a.x - b.x)

  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= LINE_Y_TOLERANCE)
    if (line) {
      line.items.push(item)
    } else {
      lines.push({ y: item.y, items: [item], text: "" })
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
    line.text = normalizeWhitespace(line.items.map((it) => it.text).join(" "))
  }
  return lines
}

function charCount(page: PageText | undefined): number {
  if (!page) return 0
  return page.items.reduce((sum, it) => sum + it.text.trim().length, 0)
}

// ---------------------------------------------------------------------------
// Lớp 1: pattern trên toàn văn bản
// ---------------------------------------------------------------------------

function applyFullTextPatterns(result: HblExtractionResult, fullText: string): void {
  const release = detectReleaseType(fullText)
  result.releaseType = {
    value: release.value,
    sourceText: release.sourceText,
    confidence: "high",
    status: release.value === "UNKNOWN" ? "not-found" : "found",
  }

  const freight = detectFreightType(fullText)
  result.freightType = {
    value: freight.value,
    sourceText: freight.sourceText,
    confidence: "high",
    status: freight.value === "UNKNOWN" ? "not-found" : "found",
  }

  const sob = detectShippedOnBoardDate(fullText)
  if (sob.value) result.shippedOnBoardDate = found(sob.value, "high", sob.sourceText)

  const hs = detectHsCode(fullText)
  if (hs.value) result.hsCode = found(hs.value, "high", hs.sourceText)
}

function applyContainerLine(result: HblExtractionResult, lines: Line[]): void {
  // Dòng chứa số container ISO 6346 và dấu "/" ngăn cách các phần.
  // Duyệt mọi dòng ứng viên vì "/" xuất hiện cả ở chỗ khác (vd "O/B OF ...")
  // và số HBL cũng có dạng chữ+số — chỉ nhận dòng parse được thành container.
  const candidates = lines.filter((l) => /[A-Z]{4}\d{7}/.test(l.text) && l.text.includes("/"))
  let parsed: ReturnType<typeof parseContainerString> = null
  let line: Line | undefined
  for (const candidate of candidates) {
    parsed = parseContainerString(candidate.text)
    if (parsed?.containerNo) {
      line = candidate
      break
    }
  }
  if (!parsed || !line) return

  const src = line.text
  if (parsed.containerNo) result.containerNo = found(parsed.containerNo, "high", src)
  if (parsed.containerType) result.containerType = found(parsed.containerType, "high", src)
  if (parsed.sealNo) result.sealNo = found(parsed.sealNo, "high", src)
  if (parsed.packages) result.packages = found(parsed.packages, "high", src)
  if (parsed.packageType) result.packageType = found(parsed.packageType, "high", src)
  if (parsed.grossWeight) result.grossWeight = found(parsed.grossWeight, "high", src)
  if (parsed.cbm) result.cbm = found(parsed.cbm, "high", src)
}

// ---------------------------------------------------------------------------
// Lớp 2: hình học
// ---------------------------------------------------------------------------

/** Vùng cột trái phía trên của trang B/L: Shipper → Consignee → Notify Party. */
function applyLeftColumnBlocks(result: HblExtractionResult, lines: Line[]): void {
  if (lines.length === 0) return
  const pageTop = Math.max(...lines.map((l) => l.y))

  // Chỉ xét các dòng bắt đầu ở sát mép trái, trong ~35% chiều cao đầu trang.
  const leftLines = lines.filter((l) => l.items[0].x < 80 && l.y > pageTop - 300)

  // Tách thành khối theo khoảng trống dọc giữa các dòng (>= 15pt coi là sang khối mới).
  const blocks: Line[][] = []
  let current: Line[] = []
  let prevY: number | null = null
  for (const line of leftLines) {
    if (prevY !== null && prevY - line.y > 15) {
      if (current.length) blocks.push(current)
      current = []
    }
    current.push(line)
    prevY = line.y
  }
  if (current.length) blocks.push(current)

  const [shipperBlock, consigneeBlock, notifyBlock] = blocks
  if (shipperBlock && result.shipper.status === "not-found") {
    result.shipper = found(blockText(shipperBlock), "medium", blockText(shipperBlock))
  }
  if (consigneeBlock && result.consignee.status === "not-found") {
    result.consignee = found(blockText(consigneeBlock), "medium", blockText(consigneeBlock))
  }
  if (notifyBlock && result.notifyParty.status === "not-found") {
    const text = blockText(notifyBlock)
    // "SAME AS CONSIGNEE***" và các dòng liên hệ kèm theo → giữ phần nghiệp vụ chính.
    const same = text.match(/SAME\s+AS\s+CONSIGNEE/i)
    result.notifyParty = found(same ? "SAME AS CONSIGNEE" : text, "medium", text)
  }
}

function blockText(block: Line[]): string {
  return normalizeLineBreaks(block.map((l) => l.text).join("\n"))
}

// Voyage: 1–2 chữ cái + 2–4 số + tối đa 2 chữ cái, phải chứa số (N067, 083W, V.12E).
const VOYAGE_TOKEN_RE = /^[A-Z]{0,2}\d{2,4}[A-Z]{0,2}$/

/** Hàng "Vessel + Voyage | Port of Loading" và hàng kế dưới "POD | Place of Delivery". */
function applyVesselRouteRows(result: HblExtractionResult, lines: Line[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.items.length < 2) continue

    const firstItem = normalizeWhitespace(line.items[0].text)
    const tokens = firstItem.split(" ")
    const last = tokens[tokens.length - 1]
    // Item đầu phải là "TÊN TÀU + số chuyến" (>= 2 từ, từ cuối khớp pattern voyage).
    if (tokens.length < 2 || !VOYAGE_TOKEN_RE.test(last) || !/\d/.test(last)) continue

    const vessel = tokens.slice(0, -1).join(" ")
    // Tên tàu phải có chữ cái (tránh nhầm dòng toàn số).
    if (!/[A-Z]{2,}/i.test(vessel)) continue

    const polItem = line.items.find((it) => it.x > line.items[0].x + 100)
    result.vessel = found(vessel, "medium", line.text)
    result.voyageNo = found(last, "medium", line.text)
    if (polItem) result.portOfLoading = found(normalizeWhitespace(polItem.text), "medium", line.text)

    // Hàng POD nằm ngay dưới trong cùng khung (cách <= 40pt), gồm 1–2 ô chữ.
    const next = lines
      .slice(i + 1)
      .find((l) => line.y - l.y > 4 && line.y - l.y <= 40 && l.items[0].x < 100)
    if (next) {
      const podItem = next.items[0]
      const deliveryItem = next.items.find((it) => it.x > podItem.x + 100)
      result.portOfDischarge = found(normalizeWhitespace(podItem.text), "medium", next.text)
      if (deliveryItem) {
        result.placeOfDelivery = found(normalizeWhitespace(deliveryItem.text), "medium", next.text)
      }
    }
    return
  }
}

/**
 * Vùng thân B/L (dưới dòng container): cột trái = Marks & Numbers,
 * cột giữa = Description of Goods.
 */
function applyBodyColumns(result: HblExtractionResult, lines: Line[]): void {
  const containerLine = lines.find((l) => /[A-Z]{4}\d{7}/.test(l.text) && l.text.includes("/"))
  if (!containerLine) return

  const bodyLines = lines.filter((l) => l.y < containerLine.y - 4 && l.y > containerLine.y - 220)
  const marks: string[] = []
  const description: string[] = []

  for (const line of bodyLines) {
    for (const item of line.items) {
      const text = normalizeWhitespace(item.text)
      if (!text) continue
      if (item.x < 130) marks.push(text)
      else if (item.x < 420) description.push(text)
      // Cột x >= 420 là weight/measurement, đã lấy từ dòng container.
    }
  }

  if (marks.length && result.marksAndNumbers.status === "not-found") {
    result.marksAndNumbers = found(marks.join("\n"), "low", marks.join("\n"))
  }
  if (description.length && result.descriptionOfGoods.status === "not-found") {
    result.descriptionOfGoods = found(description.join("\n"), "low", description.join("\n"))
  }
}

// Số HBL: 3+ chữ cái theo sau bởi 5+ chữ số (LHKHTD2606444), không trùng container/seal.
const HBL_NO_RE = /^[A-Z]{3,8}\d{5,10}$/

function applyHblNo(result: HblExtractionResult, lines: Line[]): void {
  if (lines.length === 0) return
  const pageTop = Math.max(...lines.map((l) => l.y))

  // Ưu tiên: item đứng một mình ở nửa phải, sát đầu trang (ô "B/L No." của form).
  for (const line of lines) {
    if (line.y < pageTop - 60) break
    for (const item of line.items) {
      const text = normalizeWhitespace(item.text)
      if (item.x > 250 && HBL_NO_RE.test(text) && text !== result.containerNo.value && text !== result.sealNo.value) {
        result.hblNo = found(text, "high", text)
        return
      }
    }
  }
  // Fallback: token khớp pattern ở bất kỳ đâu trong trang.
  for (const line of lines) {
    for (const token of line.text.split(" ")) {
      if (HBL_NO_RE.test(token) && token !== result.containerNo.value && token !== result.sealNo.value) {
        result.hblNo = found(token, "low", line.text)
        return
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function found(value: string, confidence: FieldConfidence, sourceText?: string): ExtractedField {
  return { value, confidence, status: "found", sourceText }
}

function notFound(): ExtractedField {
  return { value: "", confidence: "low", status: "not-found" }
}

function emptyResult(): HblExtractionResult {
  return {
    hblNo: notFound(),
    shipper: notFound(),
    consignee: notFound(),
    notifyParty: notFound(),
    vessel: notFound(),
    voyageNo: notFound(),
    portOfLoading: notFound(),
    portOfDischarge: notFound(),
    placeOfReceipt: notFound(),
    placeOfDelivery: notFound(),
    containerNo: notFound(),
    containerType: notFound(),
    sealNo: notFound(),
    packages: notFound(),
    packageType: notFound(),
    grossWeight: notFound(),
    cbm: notFound(),
    marksAndNumbers: notFound(),
    descriptionOfGoods: notFound(),
    hsCode: notFound(),
    releaseType: { value: "UNKNOWN", confidence: "low", status: "not-found" },
    freightType: { value: "UNKNOWN", confidence: "low", status: "not-found" },
    shippedOnBoardDate: notFound(),
  }
}
