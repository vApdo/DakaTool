"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Captions } from "lucide-react"
import { VideoUpload } from "@/components/auto-subtitle/video-upload"

export default function AutoSubtitlePage() {
  const router = useRouter()

  return (
    <div>
      <Link href="/tools" className="btn-secondary mb-6 text-gray-600 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Danh sách Tool
      </Link>

      <div className="mb-8 flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
          <Captions className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">
            Tự động ghép phụ đề
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Tải video lên, hệ thống tự nhận dạng giọng nói và tạo phụ đề. Bạn chỉnh sửa nội dung,
            tùy biến kiểu chữ rồi xuất SRT/VTT/ASS hoặc ghép cứng vào video.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
        <VideoUpload onStarted={(projectId) => router.push(`/tools/auto-subtitle/${projectId}`)} />
      </div>
    </div>
  )
}
