import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calculator, Code2, FileCheck2, History, ReceiptText } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnimatedSection } from "@/components/animated-section"

const PAYMENT_TOOL_HREF = "/tools/payment-request"

const highlights = [
  { label: "Xây dựng bởi", value: "VÍT APDO" },
  { label: "Dành cho", value: "ASIA GROUP" },
  { label: "Biểu mẫu", value: "05-TT" },
]

const features = [
  {
    title: "Đúng Mẫu 05-TT.",
    description: "Giấy đề nghị thanh toán dựng sẵn theo mẫu chuẩn, chọn công ty là có ngay phần đầu phiếu.",
    icon: FileCheck2,
  },
  {
    title: "Tự tính tiền, tự đọc bằng chữ.",
    description: "Nhập hàng hóa, số lượng, đơn giá — tổng tiền và số tiền bằng chữ được điền tự động, không gõ tay.",
    icon: Calculator,
  },
  {
    title: "Lưu lịch sử đề nghị.",
    description: "Mỗi lần tải PDF hoặc in đều được lưu lại để xem, in lại hay nhân bản phiếu cũ bất cứ lúc nào.",
    icon: History,
  },
]

const stack = ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"]

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
          <Link href={PAYMENT_TOOL_HREF} className="btn-primary whitespace-nowrap">
            <span className="sm:hidden">Lập phiếu</span>
            <span className="hidden sm:inline">Lập giấy đề nghị</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <AnimatedSection>
        <section className="card relative my-6 overflow-hidden">
          <HeroBackdrop />
          <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center md:py-24 lg:py-28">
            <p className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--primary-soft)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Dành riêng cho ASIA GROUP
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-none text-black dark:text-white md:text-7xl">
              Daka<span className="accent-text">Tool</span>
            </h1>
            <p className="mt-5 text-xl text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-2xl">
              Thiết kế &amp; xây dựng bởi{" "}
              <span className="accent-text font-semibold tracking-wide">VÍT APDO</span>
            </p>
            <p className="mt-6 max-w-xl text-base text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-lg">
              Công cụ nội bộ lập giấy đề nghị thanh toán cho các công ty trong ASIA GROUP — tự tính tổng, đọc số tiền
              bằng chữ, tải PDF hoặc in ngay trên trình duyệt.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href={PAYMENT_TOOL_HREF} className="btn-primary px-8">
                Lập giấy đề nghị
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/history" className="btn-outline px-8">
                Lịch sử đề nghị
              </Link>
            </div>
            <dl className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm">
              {highlights.map((h) => (
                <div key={h.label}>
                  <dd className="text-2xl font-semibold text-black dark:text-white md:text-3xl">{h.value}</dd>
                  <dt className="mt-1 text-gray-600 dark:text-[color:var(--muted)]">{h.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </AnimatedSection>

      <section className="my-20 md:my-28">
        <AnimatedSection className="mx-auto mb-12 max-w-2xl text-center" delay={0.1}>
          <h2 className="text-3xl font-semibold leading-tight text-black dark:text-white md:text-5xl">
            Một phiếu, <span className="accent-text">vài phút</span>
          </h2>
          <p className="mt-4 text-base text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-lg">
            Thay cho việc sửa file Word, tự cộng tiền và gõ số tiền bằng chữ — mở DakaTool lên là lập được phiếu
            đúng mẫu.
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
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-8">
            <div className="flex max-w-xl gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
                <Code2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Người xây dựng</p>
                <h2 className="mt-1 text-2xl font-semibold text-black dark:text-white md:text-3xl">VÍT APDO</h2>
                <p className="mt-3 text-sm text-gray-700 dark:text-[color:var(--muted-foreground)] md:text-base">
                  Tự thiết kế, lập trình và vận hành DakaTool cho ASIA GROUP — từ biểu mẫu, cách tính tiền đến lưu trữ
                  lịch sử đề nghị.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {stack.map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-[color:var(--card-border)] px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Link href={PAYMENT_TOOL_HREF} className="btn-outline">
              <ReceiptText className="h-4 w-4" />
              Dùng thử ngay
            </Link>
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[color:var(--card-border)] py-6 text-sm text-gray-500 dark:text-[color:var(--muted)]">
          <p>DakaTool · Công cụ nội bộ ASIA GROUP</p>
          <p>Xây dựng bởi VÍT APDO</p>
        </footer>
      </AnimatedSection>
    </div>
  )
}
