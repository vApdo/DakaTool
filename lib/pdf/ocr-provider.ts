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

/** Kết quả render một trang PDF ra ảnh, kèm kích thước pixel. */
export interface OcrRenderResult {
  blob: Blob
  widthPx: number
  heightPx: number
}

/**
 * Yêu cầu OCR kiểu LAZY: provider tự gọi renderPage cho từng trang khi cần,
 * nên tại một thời điểm chỉ một ảnh trang nằm trong bộ nhớ (giảm nguy cơ hết RAM
 * trên điện thoại). Cũng dùng renderPage để thử lại các góc xoay 90/180/270°.
 */
export interface OcrRequest {
  pageCount: number
  /** Hệ số scale đã dùng khi render (pixel = đơn vị PDF × scale). */
  scale: number
  /** Render một trang ở góc xoay cho trước (0/90/180/270). Người gọi tự giải phóng canvas sau đó. */
  renderPage(pageNumber: number, rotation: number): Promise<OcrRenderResult>
  /** Cho phép hủy giữa chừng; provider kiểm tra giữa các trang và ném lỗi có name "AbortError". */
  signal?: AbortSignal
}

export interface OcrProvider {
  id: string
  name: string
  /** true nếu chạy hoàn toàn trong trình duyệt, không gửi file ra ngoài. */
  runsInBrowser: boolean
  /**
   * Nhận dạng chữ từ các trang PDF. onProgress nhận giá trị 0..1 (tiến độ thật
   * từ engine, không phải mô phỏng). Xử lý tuần tự từng trang.
   */
  recognize(request: OcrRequest, onProgress?: (progress: number) => void): Promise<PageText[]>
}

export const ocrProviderRegistry: Record<string, OcrProvider> = {}

export function registerOcrProvider(provider: OcrProvider): void {
  ocrProviderRegistry[provider.id] = provider
}

export function getAvailableOcrProviders(): OcrProvider[] {
  return Object.values(ocrProviderRegistry)
}
