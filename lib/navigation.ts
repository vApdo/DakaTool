import {
  LayoutDashboard,
  Wrench,
  PlusCircle,
  LayoutTemplate,
  History,
  Download,
  type LucideIcon,
} from "lucide-react"

/**
 * Cấu hình điều hướng dùng chung cho AppSidebar (desktop) và MobileNav —
 * một nguồn duy nhất cho route/icon/thứ tự, tránh hai bản copy lệch nhau.
 */
export interface NavItem {
  href: string
  /** Label đầy đủ hiển thị trên sidebar desktop. */
  label: string
  /** Label rút gọn cho thanh nav ngang trên mobile. */
  shortLabel: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/tools", label: "Danh sách Tool", shortLabel: "Tool", icon: Wrench },
  { href: "/tools/new", label: "Tạo Tool mới", shortLabel: "Tạo mới", icon: PlusCircle },
  { href: "/templates", label: "Thư viện Template", shortLabel: "Template", icon: LayoutTemplate },
  { href: "/history", label: "Lịch sử chạy", shortLabel: "Lịch sử", icon: History },
  { href: "/export", label: "Export kết quả", shortLabel: "Export", icon: Download },
]

/** Mục /tools sáng cả trên trang chi tiết tool (/tools/[id]) nhưng nhường /tools/new cho mục riêng. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/tools") {
    return pathname === "/tools" || (pathname.startsWith("/tools/") && pathname !== "/tools/new")
  }
  return pathname === href
}
