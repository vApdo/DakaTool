import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { HIDE_AUTO_SUBTITLE } from "@/lib/data"

/**
 * Chặn cả nhánh /tools/auto-subtitle khi tool bị ẩn (build trên Vercel):
 * tool đã ẩn khỏi danh sách, nhưng link cũ/bookmark vẫn có thể trỏ thẳng vào —
 * để lọt sẽ tạo được project mà job không bao giờ chạy vì không có worker.
 */
export default function AutoSubtitleLayout({ children }: { children: ReactNode }) {
  if (HIDE_AUTO_SUBTITLE) notFound()
  return children
}
