"use client"

import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

// Error boundary ngoài khu (app) — bắt lỗi render của homepage và các trang không có sidebar.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)]">
          <AlertTriangle className="h-7 w-7 accent-text" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-white">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Có lỗi không mong muốn khi hiển thị trang. Bạn có thể thử lại; nếu vẫn lỗi, hãy tải lại trang.
        </p>
        {error.digest && <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Mã lỗi: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            <RotateCcw className="h-4 w-4" />
            Thử lại
          </button>
          <Link href="/" className="btn-outline">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  )
}
