import type { PDFPage, PDFFont } from "pdf-lib"
import {
  calculateItemTotal,
  calculatePaymentTotal,
  formatVietnameseDate,
  formatVnd,
  numberToVietnameseWords,
  type PaymentRequestData,
} from "@/lib/payment-request"

const A4: [number, number] = [595.28, 841.89]
// Match the source workbook: A4 portrait, 10 mm left and 5 mm right margins.
const LEFT_MARGIN = 28.35
const RIGHT_MARGIN = 14.17
const CONTENT_WIDTH = A4[0] - LEFT_MARGIN - RIGHT_MARGIN
// The bordered Excel table stops slightly before the printable right edge.
const TABLE_WIDTH = CONTENT_WIDTH - 3.5

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate
    else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

function drawCentered(page: PDFPage, text: string, y: number, font: PDFFont, size: number) {
  const width = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (A4[0] - width) / 2, y, font, size })
}

function drawCenteredIn(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: x + (width - textWidth) / 2, y, font, size })
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight = size * 1.25,
) {
  const lines = wrapText(text, font, size, maxWidth)
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, font, size }))
  return lines.length * lineHeight
}

function drawCellText(
  page: PDFPage,
  text: string,
  x: number,
  yBottom: number,
  width: number,
  height: number,
  font: PDFFont,
  size: number,
  align: "left" | "center" | "right" = "left",
) {
  const padding = 4
  const lines = wrapText(text, font, size, width - padding * 2).slice(0, Math.max(1, Math.floor(height / (size * 1.2))))
  const blockHeight = lines.length * size * 1.2
  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size)
    const tx =
      align === "center" ? x + (width - lineWidth) / 2 : align === "right" ? x + width - padding - lineWidth : x + padding
    const ty = yBottom + (height + blockHeight) / 2 - size * 1.05 - index * size * 1.2
    page.drawText(line, { x: tx, y: ty, font, size })
  })
}

async function fetchFont(path: string): Promise<Uint8Array> {
  const response = await fetch(path)
  if (!response.ok) throw new Error("Không tải được font tiếng Việt để tạo PDF.")
  return new Uint8Array(await response.arrayBuffer())
}

export async function generatePaymentRequestPdf(data: PaymentRequestData): Promise<Uint8Array> {
  const [{ PDFDocument, rgb }, fontkitModule] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")])
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkitModule.default)

  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    fetchFont("/fonts/TimesNewRoman-Regular.ttf"),
    fetchFont("/fonts/TimesNewRoman-Bold.ttf"),
    fetchFont("/fonts/TimesNewRoman-Italic.ttf"),
  ])
  const [regular, bold, italic] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
    pdf.embedFont(italicBytes, { subset: true }),
  ])

  const page = pdf.addPage(A4)
  const { height } = page.getSize()
  pdf.setTitle("Giấy đề nghị thanh toán")
  pdf.setAuthor(data.requesterName || "DakaTool")
  pdf.setCreator("DakaTool")

  drawWrapped(page, data.companyName.toUpperCase(), LEFT_MARGIN, height - 39, 300, bold, 10, 12)
  drawWrapped(page, data.companyAddress, LEFT_MARGIN, height - 51, 300, bold, 10, 12)

  const formTitle = "Mẫu số 05 - TT"
  const rightHeaderX = LEFT_MARGIN + TABLE_WIDTH * 0.4993
  const rightHeaderWidth = TABLE_WIDTH * 0.5007
  drawCenteredIn(page, formTitle, rightHeaderX, rightHeaderWidth, height - 39, bold, 10)
  const circular = "(Ban hành kèm theo thông tư số 133/2016/TT-BTC"
  const circular2 = "ngày 26/08/2016 của Bộ tài chính)"
  drawCenteredIn(page, circular, rightHeaderX, rightHeaderWidth, height - 52, italic, 10)
  drawCenteredIn(page, circular2, rightHeaderX, rightHeaderWidth, height - 65, italic, 10)

  drawCentered(page, "GIẤY ĐỀ NGHỊ THANH TOÁN", height - 92, bold, 16)
  drawCentered(page, formatVietnameseDate(data.requestDate), height - 108, regular, 11)

  page.drawText("Kính gửi:", { x: LEFT_MARGIN + 36, y: height - 134, font: bold, size: 11 })
  page.drawText(data.recipient, { x: LEFT_MARGIN + 88, y: height - 134, font: italic, size: 11 })
  page.drawText("Người đề nghị:", { x: LEFT_MARGIN, y: height - 149, font: regular, size: 11 })
  page.drawText(data.requesterName, { x: LEFT_MARGIN + 74, y: height - 149, font: bold, size: 11 })
  page.drawText("Bộ phận:", { x: 383, y: height - 149, font: regular, size: 11 })
  page.drawText(data.department, { x: 432, y: height - 149, font: bold, size: 11 })
  page.drawText("Nội dung thanh toán như sau:", { x: LEFT_MARGIN, y: height - 164, font: regular, size: 11 })
  if (data.paymentContent.trim()) {
    drawWrapped(page, data.paymentContent, LEFT_MARGIN + 146, height - 164, CONTENT_WIDTH - 146, regular, 11, 13)
  }

  const columns = [
    { label: "STT", width: TABLE_WIDTH * 0.0649, align: "center" as const },
    { label: "TÊN HÀNG HÓA", width: TABLE_WIDTH * 0.2835, align: "left" as const },
    { label: "ĐVT", width: TABLE_WIDTH * 0.0635, align: "center" as const },
    { label: "SỐ LƯỢNG", width: TABLE_WIDTH * 0.0874, align: "right" as const },
    { label: "ĐƠN GIÁ", width: TABLE_WIDTH * 0.1439, align: "right" as const },
    { label: "THÀNH TIỀN", width: TABLE_WIDTH * 0.134, align: "right" as const },
    { label: "GHI CHÚ", width: TABLE_WIDTH * 0.2228, align: "left" as const },
  ]
  const tableTop = height - 174
  const headerHeight = 33
  const itemCount = Math.max(1, data.items.length)
  const rowHeight = Math.min(61, 200 / itemCount)
  const tableHeight = headerHeight + rowHeight * itemCount
  const tableBottom = tableTop - tableHeight

  page.drawRectangle({
    x: LEFT_MARGIN,
    y: tableBottom,
    width: TABLE_WIDTH,
    height: tableHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
  })
  page.drawLine({
    start: { x: LEFT_MARGIN, y: tableTop - headerHeight },
    end: { x: LEFT_MARGIN + TABLE_WIDTH, y: tableTop - headerHeight },
    thickness: 0.8,
  })

  let x = LEFT_MARGIN
  columns.forEach((column, index) => {
    if (index > 0) {
      page.drawLine({ start: { x, y: tableBottom }, end: { x, y: tableTop }, thickness: 0.6 })
    }
    drawCellText(
      page,
      column.label,
      x,
      tableTop - headerHeight,
      column.width,
      headerHeight,
      bold,
      index === 5 ? 9.5 : 10.5,
      "center",
    )
    x += column.width
  })

  const displayItems = data.items.length
    ? data.items
    : [{ id: "empty", name: "", unit: "", quantity: 0, unitPrice: 0, note: "" }]
  displayItems.forEach((item, rowIndex) => {
    const rowTop = tableTop - headerHeight - rowIndex * rowHeight
    const rowBottom = rowTop - rowHeight
    if (rowIndex > 0) {
      page.drawLine({ start: { x: LEFT_MARGIN, y: rowTop }, end: { x: LEFT_MARGIN + TABLE_WIDTH, y: rowTop }, thickness: 0.45 })
    }
    const values = [
      String(rowIndex + 1),
      item.name,
      item.unit,
      item.quantity ? formatVnd(item.quantity) : "",
      item.unitPrice ? formatVnd(item.unitPrice) : "",
      calculateItemTotal(item) ? formatVnd(calculateItemTotal(item)) : "",
      item.note,
    ]
    let cellX = LEFT_MARGIN
    columns.forEach((column, columnIndex) => {
      drawCellText(page, values[columnIndex], cellX, rowBottom, column.width, rowHeight, regular, 10.5, column.align)
      cellX += column.width
    })
  })

  const total = calculatePaymentTotal(data.items)
  const totalHeight = 21
  const totalBottom = tableBottom - totalHeight
  page.drawRectangle({
    x: LEFT_MARGIN,
    y: totalBottom,
    width: TABLE_WIDTH,
    height: totalHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
  })
  const totalLabelWidth = columns.slice(0, 5).reduce((sum, column) => sum + column.width, 0)
  page.drawLine({
    start: { x: LEFT_MARGIN + totalLabelWidth, y: totalBottom },
    end: { x: LEFT_MARGIN + totalLabelWidth, y: tableBottom },
    thickness: 0.6,
  })
  page.drawLine({
    start: { x: LEFT_MARGIN + totalLabelWidth + columns[5].width, y: totalBottom },
    end: { x: LEFT_MARGIN + totalLabelWidth + columns[5].width, y: tableBottom },
    thickness: 0.6,
  })
  drawCellText(page, "TỔNG", LEFT_MARGIN, totalBottom, totalLabelWidth, totalHeight, bold, 11, "center")
  drawCellText(
    page,
    formatVnd(total),
    LEFT_MARGIN + totalLabelWidth,
    totalBottom,
    columns[5].width,
    totalHeight,
    bold,
    10.5,
    "right",
  )

  const wordsY = totalBottom - 13
  page.drawText("Bằng chữ:", { x: LEFT_MARGIN + 36, y: wordsY, font: italic, size: 11 })
  drawWrapped(page, `${numberToVietnameseWords(total)}./`, LEFT_MARGIN + 89, wordsY, CONTENT_WIDTH - 113, italic, 11, 13)

  const signatureY = Math.max(54, wordsY - 26)
  const signatureColumns = [
    { start: 0.0649, width: 0.2835 },
    { start: 0.3484, width: 0.1509 },
    { start: 0.4993, width: 0.2074 },
    { start: 0.7067, width: 0.2933 },
  ]
  ;["Phê duyệt", "Kế toán", "Trưởng bộ phận", "Người đề nghị"].forEach((label, index) => {
    const signatureColumn = signatureColumns[index]
    const sx = LEFT_MARGIN + signatureColumn.start * TABLE_WIDTH
    const signatureWidth = signatureColumn.width * TABLE_WIDTH
    drawCellText(page, label, sx, signatureY, signatureWidth, 24, bold, 11, "center")
    drawCellText(page, "(Ký, họ tên)", sx, signatureY - 17, signatureWidth, 22, italic, 11, "center")
  })

  return pdf.save()
}
