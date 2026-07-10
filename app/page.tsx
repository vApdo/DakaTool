import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Wrench, PlayCircle, History, LayoutTemplate, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { tools, runs } from "@/lib/data"

const features = [
  {
    title: "Tạo tool một lần",
    description: "Mô tả công việc lặp lại thành một tool có form nhập liệu rõ ràng, ai trong nhóm cũng chạy được.",
    icon: Wrench,
  },
  {
    title: "Chạy khi cần",
    description: "Điền thông tin, bấm chạy và theo dõi tiến trình trực tiếp. Kết quả lưu lại đầy đủ trong lịch sử.",
    icon: PlayCircle,
  },
  {
    title: "Không làm lại từ đầu",
    description: "Thư viện template gom sẵn các quy trình hay dùng — nhân bản rồi chỉnh cho việc của bạn.",
    icon: LayoutTemplate,
  },
]

export default function HomePage() {
  const activeTools = tools.filter((t) => t.status === "active").length
  const totalRuns = tools.reduce((sum, t) => sum + t.runsCount, 0)

  return (
    <div className="container">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A7FEE] text-white">
            <Zap className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold text-black dark:text-white">
            Daka<span className="accent-text">Tool</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard" className="btn-primary">
            Vào Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="card my-8 relative overflow-hidden shadow-md">
        <div className="p-8 md:p-10 lg:p-12 flex flex-col md:flex-row items-start">
          <div className="w-full md:w-3/5 z-10">
            <h1 className="text-black dark:text-white text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
              Việc lặp lại,
              <span className="block accent-text">giao cho tool</span>
              làm thay
            </h1>
            <p className="my-6 text-sm md:text-base max-w-md text-gray-700 dark:text-gray-300">
              DakaTool là nơi tạo, quản lý và chạy các tool tự động hóa công việc hằng ngày — đổi tên file, gộp báo
              cáo, gửi email định kỳ — dùng trong nội bộ, không cần code lại từ đầu.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="btn-primary">
                Bắt đầu ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/tools" className="btn-secondary text-black dark:text-white">
                Xem danh sách tool
              </Link>
            </div>
            <dl className="mt-8 flex gap-8 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Tool sẵn sàng</dt>
                <dd className="text-2xl font-semibold text-black dark:text-white">{activeTools}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Lượt chạy</dt>
                <dd className="text-2xl font-semibold text-black dark:text-white">{totalRuns}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Lần chạy gần nhất</dt>
                <dd className="text-2xl font-semibold text-black dark:text-white">Hôm nay</dd>
              </div>
            </dl>
          </div>
          <div className="hidden md:flex md:w-2/5 md:absolute md:right-0 md:top-0 md:bottom-0 md:items-center">
            <Image
              src="/purple-circle-wave-static.png"
              alt=""
              width={500}
              height={500}
              className="w-full h-auto md:h-full md:w-auto md:object-cover md:object-left"
              priority
            />
          </div>
        </div>
      </section>

      <section className="my-16">
        <h2 className="text-black dark:text-white mb-4 text-3xl md:text-4xl font-medium leading-tight">
          Một chỗ cho mọi
          <span className="block accent-text">việc tự động</span>
        </h2>
        <p className="mb-10 max-w-2xl text-gray-700 dark:text-gray-300">
          Thay vì mỗi người giữ một mớ script rời rạc, DakaTool gom tất cả về một nơi: có form nhập liệu, có lịch sử
          chạy, có kết quả để xuất ra.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="bg-[#7A7FEE] w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">{f.title}</h3>
              <p className="text-gray-700 dark:text-gray-300">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card my-16 p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">Hoạt động gần đây</h2>
            <p className="mt-2 max-w-xl text-sm text-gray-700 dark:text-gray-300">
              {runs[1].summary} — và {runs.length - 1} lần chạy khác trong tuần này.
            </p>
          </div>
          <Link href="/history" className="btn-outline">
            <History className="h-4 w-4" />
            Xem lịch sử chạy
          </Link>
        </div>
      </section>

      <footer className="border-t border-[color:var(--card-border)] py-6 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap justify-between gap-2">
        <p>DakaTool — công cụ tự động hóa nội bộ.</p>
        <p>MVP 0.1 · Dữ liệu mẫu, chưa kết nối hệ thống thật.</p>
      </footer>
    </div>
  )
}
