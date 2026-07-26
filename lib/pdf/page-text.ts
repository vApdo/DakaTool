import type { PageText, PositionedItem } from "./types"

/**
 * Chuyển TextContent của pdf.js thành PageText: giữ lại các item có chuỗi
 * kèm tọa độ (x, y, width) mà extract-hbl dựa vào để suy luận theo hình học.
 *
 * Hàm thuần, không phụ thuộc trình duyệt — extract-text.ts (chạy trong browser)
 * và test/pdf/fixtures.ts (chạy trong Node) cùng import để bước mapping này
 * chỉ có MỘT bản: test đi qua đúng code production, không lo hai bản copy lệch nhau.
 */

/** Cấu trúc tối thiểu của TextContent trả về từ page.getTextContent() của pdf.js. */
export interface TextContentLike {
  items: object[]
}

export function pageTextFromTextContent(content: TextContentLike, pageNumber: number): PageText {
  return {
    pageNumber,
    items: content.items.flatMap((item): PositionedItem[] => {
      if (!("str" in item)) return [] // TextMarkedContent — không phải text
      const t = item as { str: string; transform: number[]; width: number }
      return [{ text: t.str, x: t.transform[4], y: t.transform[5], width: t.width }]
    }),
  }
}
