import type React from "react"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "DakaTool - Nền tảng tool tự động hóa nội bộ",
  description:
    "DakaTool giúp bạn tạo, quản lý và chạy các tool tự động hóa công việc hằng ngày — dùng nội bộ, không cần code lại từ đầu.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
