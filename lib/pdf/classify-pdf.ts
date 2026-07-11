import type { PageText, PdfClassification } from "./types"

/**
 * Ngưỡng ký tự trung bình mỗi trang để coi là PDF có lớp văn bản.
 * Bản scan thường có 0 ký tự; một vài PDF chỉ có số trang/watermark (< 40 ký tự)
 * cũng không đủ dữ liệu để trích xuất.
 */
const MIN_AVG_CHARS_PER_PAGE = 40

/** Phân loại PDF là bản có text hay bản scan dựa trên lượng text đọc được. */
export function classifyPdf(pages: PageText[]): PdfClassification {
  const charsPerPage = pages.map((page) =>
    page.items.reduce((sum, item) => sum + item.text.trim().length, 0),
  )
  const total = charsPerPage.reduce((a, b) => a + b, 0)
  const avg = pages.length > 0 ? total / pages.length : 0

  // Chỉ cần MỘT trang có nhiều text là xử lý được (nhiều HBL chỉ có trang 1 chứa dữ liệu).
  const bestPage = Math.max(0, ...charsPerPage)

  return {
    kind: bestPage >= MIN_AVG_CHARS_PER_PAGE && avg > 0 ? "text" : "scan",
    pageCount: pages.length,
    charsPerPage,
  }
}
