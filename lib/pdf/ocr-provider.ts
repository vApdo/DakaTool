import type { PageText } from "./types"

/**
 * Kiến trúc chuẩn bị cho OCR (phiên bản sau).
 *
 * Khi PDF là bản scan, pipeline hiện tại dừng ở trạng thái "needs-ocr".
 * Để thêm OCR, cài đặt interface OcrProvider rồi đăng ký vào ocrProviderRegistry —
 * phần còn lại của pipeline (classify → extract-hbl → UI) không cần thay đổi
 * vì extract-hbl chỉ nhận PageText[], không quan tâm text đến từ đâu.
 *
 * Ứng viên dự kiến:
 * - "tesseract-js": chạy trong trình duyệt, miễn phí (render trang PDF ra canvas → nhận dạng)
 * - "ocrmypdf": chạy server/CLI, cần backend
 * - "google-document-ai" | "azure-document-intelligence" | "aws-textract": API trả phí, cần backend
 */
export interface OcrProvider {
  id: string
  name: string
  /** true nếu chạy hoàn toàn trong trình duyệt, không gửi file ra ngoài. */
  runsInBrowser: boolean
  /** Nhận ảnh các trang (đã render từ PDF) và trả về text có tọa độ, cùng định dạng với extract-text. */
  recognize(pages: ImageBitmap[] | Blob[]): Promise<PageText[]>
}

/** Registry OCR — hiện rỗng, phiên bản 1 chưa tích hợp OCR. */
export const ocrProviderRegistry: Record<string, OcrProvider> = {}

export function getAvailableOcrProviders(): OcrProvider[] {
  return Object.values(ocrProviderRegistry)
}
