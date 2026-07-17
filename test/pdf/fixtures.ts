import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { PageText, PositionedItem } from "@/lib/pdf/types"

/**
 * Fixture PDF GIẢ LẬP cho test — KHÔNG dùng chứng từ thật của khách hàng.
 *
 * Vì logic trích xuất HBL dựa trên hình học (tọa độ text), fixture được dựng
 * bằng pdf-lib với text đặt đúng vị trí mà extract-hbl mong đợi:
 *   - Số HBL đứng riêng ở nửa phải sát đầu trang.
 *   - Cột trái đầu trang: 3 khối Shipper / Consignee / Notify.
 *   - Hàng "Vessel Voyage | POL" và hàng dưới "POD | Place of Delivery".
 *   - Dòng container ISO 6346 ngăn cách bằng "/".
 *   - Các cụm nghiệp vụ (TELEX RELEASE, FREIGHT PREPAID, SHIPPED ON BOARD, HS CODE).
 *
 * Đọc lại bằng pdfjs-dist (legacy) cho ra cùng cấu trúc PageText[] như khi
 * extract-text.ts đọc PDF trong trình duyệt, nên đây là test tích hợp thật:
 * PDF (bytes) → text layer (pdfjs) → extract-hbl.
 */

/** Giá trị GIẢ mà fixture nhúng vào — test đối chiếu lại đúng các giá trị này. */
export const SYNTHETIC_HBL = {
  hblNo: "SGN1234567",
  shipper: "ACME SHIPPING COMPANY LIMITED",
  consignee: "GLOBAL IMPORTS KABUSHIKI KAISHA",
  notifyParty: "SAME AS CONSIGNEE",
  vessel: "WAN HAI 295",
  voyageNo: "N067",
  portOfLoading: "HONGKONG",
  portOfDischarge: "HAKATA",
  placeOfDelivery: "OSAKA",
  containerNo: "WHSU8729485",
  containerType: "40'HQ",
  sealNo: "WHLY064496",
  packages: "2",
  packageType: "SKIDS",
  grossWeight: "140.000 KGS",
  cbm: "2.6110 CBM",
  releaseType: "SURRENDER",
  freightType: "PREPAID",
  shippedOnBoardDate: "28-JUN-2026",
  hsCode: "90318080",
} as const

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

interface TextCell {
  x: number
  y: number
  text: string
  size?: number
}

/** Các ô text tạo nên layout HBL giả — toạ độ y theo gốc góc trái DƯỚI (như pdf.js). */
const HBL_CELLS: TextCell[] = [
  // Số HBL: nửa phải, sát đầu trang, đứng riêng.
  { x: 400, y: 800, text: SYNTHETIC_HBL.hblNo },

  // Cột trái: Shipper (2 dòng) → khối cách >15pt.
  { x: 40, y: 760, text: SYNTHETIC_HBL.shipper },
  { x: 40, y: 748, text: "12 EXPORT AVENUE, SINGAPORE" },
  // Consignee.
  { x: 40, y: 720, text: SYNTHETIC_HBL.consignee },
  { x: 40, y: 708, text: "5 HARBOUR ROAD, TOKYO" },
  // Notify.
  { x: 40, y: 680, text: SYNTHETIC_HBL.notifyParty },

  // Hàng Vessel + Voyage | Port of Loading.
  { x: 40, y: 470, text: `${SYNTHETIC_HBL.vessel} ${SYNTHETIC_HBL.voyageNo}` },
  { x: 200, y: 470, text: SYNTHETIC_HBL.portOfLoading },
  // Hàng Port of Discharge | Place of Delivery (ngay dưới, <=40pt).
  { x: 40, y: 440, text: SYNTHETIC_HBL.portOfDischarge },
  { x: 200, y: 440, text: SYNTHETIC_HBL.placeOfDelivery },

  // Cụm nghiệp vụ (nằm trên dòng container để không bị coi là Marks/Description).
  { x: 40, y: 420, text: "TELEX RELEASE" },
  { x: 40, y: 405, text: "FREIGHT PREPAID" },
  { x: 40, y: 390, text: `SHIPPED ON BOARD ${SYNTHETIC_HBL.shippedOnBoardDate}` },
  { x: 40, y: 375, text: `HS CODE ${SYNTHETIC_HBL.hsCode}` },

  // Dòng container ISO 6346.
  {
    x: 40,
    y: 350,
    text: `${SYNTHETIC_HBL.containerNo} / ${SYNTHETIC_HBL.containerType} / ${SYNTHETIC_HBL.sealNo} / ${SYNTHETIC_HBL.packages}${SYNTHETIC_HBL.packageType} / 140.000KGS / 2.6110CBM`,
  },
]

/** Dựng PDF HBL giả có text layer. */
export async function buildHblTextPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const cell of HBL_CELLS) {
    page.drawText(cell.text, { x: cell.x, y: cell.y, size: cell.size ?? 9, font })
  }
  return doc.save()
}

/**
 * Dựng PDF "scan" giả: các trang chỉ có hình khối, KHÔNG có text layer,
 * để classify-pdf phân loại là "scan" (cần OCR).
 */
export async function buildScanPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([A4_WIDTH, A4_HEIGHT])
    // Vẽ vài hình chữ nhật xám (không phải text) để giống ảnh scan.
    page.drawRectangle({ x: 60, y: 600, width: 400, height: 120, color: rgb(0.85, 0.85, 0.85) })
    page.drawRectangle({ x: 60, y: 300, width: 480, height: 220, color: rgb(0.9, 0.9, 0.9) })
  }
  return doc.save()
}

/** Đọc PDF bytes trong Node bằng pdfjs (legacy) → PageText[] như trong trình duyệt. */
export async function loadPagesFromPdfBytes(bytes: Uint8Array): Promise<PageText[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = getDocument({ data: bytes })
  const doc = await loadingTask.promise
  const pages: PageText[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push({
      pageNumber: i,
      items: content.items.flatMap((item): PositionedItem[] =>
        "str" in item
          ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }]
          : [],
      ),
    })
  }
  await loadingTask.destroy()
  return pages
}
