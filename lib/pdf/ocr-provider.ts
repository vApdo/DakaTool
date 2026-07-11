import type { PageText } from "./types"

/**
 * Kiến trúc OCR của pipeline HBL.
 *
 * Khi PDF là bản scan (không có text layer), runner render từng trang ra ảnh
 * rồi đưa cho một OcrProvider. Provider trả về PageText[] — đúng cấu trúc mà
 * extract-text.ts tạo ra từ text layer, nên phần còn lại của pipeline
 * (extract-hbl → UI) dùng lại nguyên vẹn, không cần biết text đến từ đâu.
 *
 * Provider hiện có:
 * - "tesseract-js" (lib/pdf/ocr-tesseract.ts): chạy trong trình duyệt, miễn phí,
 *   asset tự host trong public/ocr — file không rời khỏi máy người dùng.
 * Ứng viên tương lai (cần backend hoặc API trả phí):
 * - OCRmyPDF, Google Document AI, Azure Document Intelligence, AWS Textract.
 */

/** Ảnh một trang PDF đã render, kèm thông tin để quy đổi tọa độ pixel → tọa độ PDF. */
export interface OcrPageImage {
  pageNumber: number
  blob: Blob
  widthPx: number
  heightPx: number
  /** Hệ số scale đã dùng khi render (pixel = đơn vị PDF × scale). */
  scale: number
  /**
   * Render lại trang ở góc xoay khác (90/180/270°) — provider dùng khi nghi ngờ
   * bản scan bị đặt ngược/nghiêng (confidence thấp). Trả về ảnh và kích thước mới.
   */
  render?: (rotation: number) => Promise<{ blob: Blob; widthPx: number; heightPx: number }>
}

export interface OcrProvider {
  id: string
  name: string
  /** true nếu chạy hoàn toàn trong trình duyệt, không gửi file ra ngoài. */
  runsInBrowser: boolean
  /**
   * Nhận dạng chữ từ ảnh các trang. onProgress nhận giá trị 0..1 (tiến độ thật
   * từ engine, không phải mô phỏng).
   */
  recognize(pages: OcrPageImage[], onProgress?: (progress: number) => void): Promise<PageText[]>
}

export const ocrProviderRegistry: Record<string, OcrProvider> = {}

export function registerOcrProvider(provider: OcrProvider): void {
  ocrProviderRegistry[provider.id] = provider
}

export function getAvailableOcrProviders(): OcrProvider[] {
  return Object.values(ocrProviderRegistry)
}
