"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wrench,
  PlusCircle,
  LayoutTemplate,
  History,
  Download,
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Danh sách Tool", icon: Wrench },
  { href: "/tools/new", label: "Tạo Tool mới", icon: PlusCircle },
  { href: "/templates", label: "Thư viện Template", icon: LayoutTemplate },
  { href: "/history", label: "Lịch sử chạy", icon: History },
  { href: "/export", label: "Export kết quả", icon: Download },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full flex-col border-r border-[color:var(--card-border)] bg-[color:var(--card)]">
      <div className="flex items-center gap-2 px-5 py-5">
        <Image src="/logo-dk.svg" alt="" width={32} height={32} className="h-8 w-8" />
        <Link href="/" className="text-lg font-semibold text-black dark:text-white">
          Daka<span className="accent-text">Tool</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Điều hướng chính">
        {navItems.map((item) => {
          const active =
            item.href === "/tools"
              ? pathname === "/tools" || (pathname.startsWith("/tools/") && pathname !== "/tools/new")
              : pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "accent-fill shadow-sm"
                  : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center justify-between px-5 py-4 border-t border-[color:var(--card-border)]">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300">Bản nội bộ</p>
          <p>MVP 0.1</p>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}
