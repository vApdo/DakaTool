import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "DakaTool - Nền tảng tool tự động hóa nội bộ",
  description:
    "DakaTool giúp bạn tạo, quản lý và chạy các tool tự động hóa công việc hằng ngày — dùng nội bộ, không cần code lại từ đầu.",
  // Bản nội bộ: không cho công cụ tìm kiếm đánh chỉ mục (xem thêm app/robots.ts).
  robots: { index: false, follow: false },
  // Cho phép cài lên màn hình chính điện thoại (PWA).
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DakaTool", statusBarStyle: "black-translucent" },
}

/**
 * viewportFit=cover để nội dung không bị "tai thỏ" che trên iPhone.
 * Không khóa zoom để người dùng có thể phóng to nội dung khi cần.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1211" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={GeistSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
