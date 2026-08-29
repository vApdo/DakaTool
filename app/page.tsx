import Link from "next/link"
import Image from "next/image"
import { ArrowRight, FileText, History, ReceiptText } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedSection } from "@/components/animated-section"
import { tools } from "@/lib/data"

const features = [
  {
    title: "Xử lý PDF trọn bộ.",
    description:
      "Ghép, tách, sắp xếp, ký tên, đóng dấu, đánh số trang, chuyển đổi ảnh — chạy ngay trên trình duyệt, file không rời máy bạn.",
    icon: FileText,
  },
  {
    title: "Tạo chứng từ theo biểu mẫu.",
    description:
      "Nhập thông tin một lần, xem trước theo mẫu chuẩn rồi tải PDF hoặc in trực tiếp ngay trên trình duyệt.",
    icon: ReceiptText,
  },
  {
    title: "Lịch sử chạy rõ ràng.",
    description:
      "Mỗi lần chạy tool đều được ghi lại trên trình duyệt của bạn — xem lại kết quả, tỷ lệ thành công bất cứ lúc nào.",
    icon: History,
  },
]

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        className="h-full w-full text-foreground [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <rect
              width="35.6"
              height="35.6"
              x="0.2"
              y="0.2"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.11"
              strokeWidth="0.4"
              strokeDasharray="2 2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
      <div className="absolute left-1/2 top-[-40%] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[color:var(--glow)] blur-[130px]" />
      <div className="absolute bottom-[-55%] right-[-10%] h-[420px] w-[560px] rotate-[-33deg] rounded-full bg-[color:var(--glow)] blur-[130px]" />
    </div>
  )
}

export default function HomePage() {
  const activeTools = tools.filter((t) => t.status === "active").length
  const pdfTools = tools.filter((t) => t.category === "PDF").length

  return (
    <div className="container">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <Image src="/logo-dk.svg" alt="" width={32} height={32} className="h-8 w-8" />
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

      <AnimatedSection>
        <section className="card relative my-6 overflow-hidden">
          <HeroBackdrop />
          <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center md:py-24 lg:py-28">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-black dark:text-white md:text-6xl md:leading-[1.1]">
              Hệ thống <span className="accent-text">tự động hóa</span> nội bộ doanh nghiệp
            </h1>
            <p className="mt-6 max-w-xl text-base text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-lg">
              DakaTool là nơi cung cấp công cụ tự động hóa công việc hằng ngày — xử lý PDF, trích xuất dữ liệu chứng
              từ và tạo biểu mẫu nội bộ — dùng trực tiếp trên trình duyệt, không cần cài đặt.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/dashboard" className="btn-primary px-8">
                Bắt đầu ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/tools" className="btn-outline px-8">
                Xem danh sách tool
              </Link>
            </div>
            <dl className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm">
              <div>
                <dd className="text-3xl font-semibold text-black dark:text-white">{activeTools}</dd>
                <dt className="mt-1 text-gray-600 dark:text-[color:var(--muted)]">Tool sẵn sàng</dt>
              </div>
              <div>
                <dd className="text-3xl font-semibold text-black dark:text-white">{pdfTools}</dd>
                <dt className="mt-1 text-gray-600 dark:text-[color:var(--muted)]">Tool xử lý PDF</dt>
              </div>
              <div>
                <dd className="text-3xl font-semibold text-black dark:text-white">100%</dd>
                <dt className="mt-1 text-gray-600 dark:text-[color:var(--muted)]">Tool PDF chạy ngay trên trình duyệt</dt>
              </div>
            </dl>
          </div>
        </section>
      </AnimatedSection>

      <section className="my-20 md:my-28">
        <AnimatedSection className="mx-auto mb-12 max-w-2xl text-center" delay={0.1}>
          <h2 className="text-3xl font-semibold leading-tight text-black dark:text-white md:text-5xl">
            Một chỗ cho mọi <span className="accent-text">việc tự động</span>
          </h2>
          <p className="mt-4 text-base text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-lg">
            Thay vì mỗi người giữ một mớ công cụ rời rạc, DakaTool gom tất cả về một nơi: mở lên là dùng được ngay,
            kết quả ghi lại rõ ràng.
          </p>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <AnimatedSection key={f.title} delay={0.1 + i * 0.1}>
              <div className="card h-full p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <p className="mt-5 text-lg leading-7 text-black dark:text-white">
                  {f.title}{" "}
                  <span className="text-gray-600 dark:text-[color:var(--muted)]">{f.description}</span>
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      <AnimatedSection delay={0.1}>
        <section className="card relative my-20 overflow-hidden p-8 md:p-10">
          <div
            className="pointer-events-none absolute right-[-20%] top-[-60%] h-[320px] w-[480px] rounded-full bg-[color:var(--glow)] blur-[130px]"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white md:text-3xl">Hoạt động gần đây</h2>
              <p className="mt-2 max-w-xl text-sm text-gray-700 dark:text-[color:var(--muted-foreground)]">
                Mỗi lần chạy tool đều được ghi lại trên trình duyệt của bạn: chạy lúc nào, mất bao lâu, kết quả ra
                sao.
              </p>
            </div>
            <Link href="/history" className="btn-outline">
              <History className="h-4 w-4" />
              Xem lịch sử chạy
            </Link>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[color:var(--card-border)] py-6 text-sm text-gray-500 dark:text-[color:var(--muted)]">
          <p>DakaTool — hệ thống tự động hóa nội bộ.</p>
          <p>Xây dựng và phát triển bởi vApdo</p>
        </footer>
      </AnimatedSection>
    </div>
  )
}
