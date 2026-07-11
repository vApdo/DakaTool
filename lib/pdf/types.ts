/**
 * Kiểu dữ liệu dùng chung cho pipeline trích xuất HBL từ PDF.
 * Pipeline: extract-text (đọc PDF) → classify-pdf (text/scan) → extract-hbl (phân tích) → UI.
 */

/** Một đoạn text trong PDF kèm tọa độ (gốc tọa độ pdf.js: góc trái DƯỚI trang). */
export interface PositionedItem {
  text: string
  x: number
  y: number
  width: number
}

/** Text của một trang: danh sách item có tọa độ. */
export interface PageText {
  pageNumber: number
  items: PositionedItem[]
}

export type PdfKind = "text" | "scan"

export interface PdfClassification {
  kind: PdfKind
  pageCount: number
  /** Số ký tự có nghĩa trên từng trang — dùng để quyết định text/scan. */
  charsPerPage: number[]
}

export type FieldConfidence = "high" | "medium" | "low"

export type FieldStatus = "found" | "not-found"

/** Một trường trích xuất được, kèm nguồn gốc để người dùng đối chiếu. */
export interface ExtractedField {
  value: string
  confidence: FieldConfidence
  status: FieldStatus
  /** Đoạn text gốc trong PDF mà giá trị được lấy ra. */
  sourceText?: string
}

export type ReleaseType = "ORIGINAL" | "SURRENDER" | "WAYBILL" | "UNKNOWN"
export type FreightType = "PREPAID" | "COLLECT" | "UNKNOWN"

export interface HblExtractionResult {
  hblNo: ExtractedField
  shipper: ExtractedField
  consignee: ExtractedField
  notifyParty: ExtractedField
  vessel: ExtractedField
  voyageNo: ExtractedField
  portOfLoading: ExtractedField
  portOfDischarge: ExtractedField
  placeOfReceipt: ExtractedField
  placeOfDelivery: ExtractedField
  containerNo: ExtractedField
  containerType: ExtractedField
  sealNo: ExtractedField
  packages: ExtractedField
  packageType: ExtractedField
  grossWeight: ExtractedField
  cbm: ExtractedField
  marksAndNumbers: ExtractedField
  descriptionOfGoods: ExtractedField
  hsCode: ExtractedField
  releaseType: ExtractedField & { value: ReleaseType }
  freightType: ExtractedField & { value: FreightType }
  shippedOnBoardDate: ExtractedField
}

export type HblFieldKey = keyof HblExtractionResult

/** Nhãn tiếng Việt/nghiệp vụ cho từng trường, dùng chung cho form và export. */
export const HBL_FIELD_LABELS: Record<HblFieldKey, string> = {
  hblNo: "HBL No",
  shipper: "Shipper",
  consignee: "Consignee",
  notifyParty: "Notify Party",
  vessel: "Vessel",
  voyageNo: "Voyage No",
  portOfLoading: "Port of Loading",
  portOfDischarge: "Port of Discharge",
  placeOfReceipt: "Place of Receipt",
  placeOfDelivery: "Place of Delivery",
  containerNo: "Container No",
  containerType: "Container Type",
  sealNo: "Seal No",
  packages: "Packages",
  packageType: "Package Type",
  grossWeight: "Gross Weight",
  cbm: "CBM",
  marksAndNumbers: "Marks and Numbers",
  descriptionOfGoods: "Description of Goods",
  hsCode: "HS Code",
  releaseType: "Release Type",
  freightType: "Freight Type",
  shippedOnBoardDate: "Shipped on Board Date",
}

export const HBL_FIELD_ORDER = Object.keys(HBL_FIELD_LABELS) as HblFieldKey[]
