import Link from "next/link"
import { SearchX, ArrowLeft } from "lucide-react"

export const metadata = { title: "Không tìm thấy trang" }

// 404 toàn cục cho mọi URL không khớp route nào (ngoài khu (app) nên không có sidebar).
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)]">
          <SearchX className="h-7 w-7 accent-text" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-white">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Về Dashboard
          </Link>
          <Link href="/tools" className="btn-outline">
            <ArrowLeft className="h-4 w-4" />
            Danh sách Tool
          </Link>
        </div>
      </div>
    </div>
  )
}
