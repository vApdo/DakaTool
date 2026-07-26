import Link from "next/link"
import { FileSpreadsheet, FileText, FileJson, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"

export const metadata = { title: "Export kết quả" }

const formats = [
  { name: "Excel (.xlsx)", description: "Bảng kết quả đầy đủ, mỗi lần chạy một sheet.", icon: FileSpreadsheet },
  { name: "PDF", description: "Bản báo cáo để in hoặc gửi cho quản lý.", icon: FileText },
  { name: "JSON", description: "Dữ liệu thô cho hệ thống khác đọc tiếp.", icon: FileJson },
]

export default function ExportPage() {
  return (
    <div>
      <PageHeader
        title="Export kết quả"
        description="Xuất kết quả các lần chạy tool ra file để lưu trữ hoặc chia sẻ."
      />

      <div className="card p-8 md:p-10">
        <span className="inline-flex items-center rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-medium text-primary">
          Sắp có trong bản kế tiếp
        </span>
        <h2 className="mt-4 text-xl md:text-2xl font-semibold text-black dark:text-white">
          Tính năng export đang được xây dựng
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Ở bản MVP này, kết quả các lần chạy được lưu trong lịch sử. Bản kế tiếp sẽ cho phép xuất kết quả ra các định
          dạng dưới đây.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {formats.map((f) => (
            <div key={f.name} className="rounded-2xl border border-dashed border-[color:var(--border)] p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold text-black dark:text-white">{f.name}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>

        <Link href="/history" className="btn-secondary mt-8 text-black dark:text-white">
          Trong lúc chờ, xem lịch sử chạy
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
