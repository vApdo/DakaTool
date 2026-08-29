"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Wrench, History } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Tool", icon: Wrench },
  { href: "/history", label: "Lịch sử", icon: History },
]

export function MobileNav() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)

  // Thanh menu cuộn ngang nên trên màn hẹp mục đang mở có thể nằm khuất ngoài mép
  // phải (người dùng tưởng không có). Tự kéo mục đang mở vào tầm nhìn khi tải trang.
  useEffect(() => {
    const current = navRef.current?.querySelector('[aria-current="page"]')
    current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [pathname])

  return (
    <div className="md:hidden border-b border-[color:var(--card-border)] bg-[color:var(--card)]">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-dk.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-semibold text-black dark:text-white">
            Daka<span className="accent-text">Tool</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
      <nav
        ref={navRef}
        className="flex snap-x gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Điều hướng chính"
      >
        {navItems.map((item) => {
          const active =
            item.href === "/tools" ? pathname === "/tools" || pathname.startsWith("/tools/") : pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "accent-fill"
                  : "text-gray-700 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
