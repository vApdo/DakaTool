import Link from "next/link"
import { SearchX, ArrowLeft } from "lucide-react"

export const metadata = { title: "Không tìm thấy tool" }

// Hiển thị khi notFound() được gọi với id tool không tồn tại — vẫn nằm trong shell sidebar của khu (app).
export default function ToolNotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)]">
        <SearchX className="h-7 w-7 accent-text" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-black dark:text-white">Không tìm thấy tool</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Tool này không tồn tại hoặc đã bị đổi tên. Hãy chọn lại từ danh sách tool.
      </p>
      <div className="mt-6 flex items-center justify-center">
        <Link href="/tools" className="btn-primary">
          <ArrowLeft className="h-4 w-4" />
          Danh sách Tool
        </Link>
      </div>
    </div>
  )
}
