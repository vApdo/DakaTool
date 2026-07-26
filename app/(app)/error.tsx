"use client"

import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

// Error boundary cho khu (app): các tool PDF/OCR xử lý file người dùng ngay trên trình duyệt
// (file hỏng, mã hóa, hết RAM...) nên cần điểm phục hồi thay vì trắng trang. Sidebar vẫn giữ nguyên.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)]">
        <AlertTriangle className="h-7 w-7 accent-text" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-black dark:text-white">Đã xảy ra lỗi</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Có lỗi không mong muốn khi xử lý. Nếu đang chạy tool với file lớn, hãy thử lại với file nhỏ hơn hoặc ít trang
        hơn.
      </p>
      {error.digest && <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Mã lỗi: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" />
          Thử lại
        </button>
        <Link href="/dashboard" className="btn-outline">
          Về Dashboard
        </Link>
      </div>
    </div>
  )
}
