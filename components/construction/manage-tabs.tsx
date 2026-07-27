"use client"

import { useState } from "react"

export type ManageTab = "photos" | "progress" | "costs"

const TABS: Array<{ id: ManageTab; label: string; icon: string }> = [
  { id: "photos", label: "Đăng ảnh", icon: "📷" },
  { id: "progress", label: "Tiến độ", icon: "📊" },
  { id: "costs", label: "Chi phí", icon: "💰" },
]

/**
 * Thanh chọn việc cho trang quản lý — CHỈ hiện trên mobile.
 *
 * Ở công trường, người dùng mở trang ra là để chụp và đăng ngay; không nên bắt họ
 * cuộn qua bảng hạng mục và bảng chi phí. Từ 768px trở lên (máy tính bảng/máy tính)
 * ẩn thanh này đi và hiển thị cả ba phần xếp dọc như cũ.
 */
export function ManageTabs({
  value,
  onChange,
}: {
  value: ManageTab
  onChange: (t: ManageTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Chọn việc cần làm"
      className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 md:hidden dark:bg-gray-800/60"
    >
      {TABS.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition ${
              active
                ? "bg-white text-black shadow-sm dark:bg-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Bọc một phần nội dung: ẩn trên mobile khi không phải tab đang chọn, luôn hiện từ md. */
export function TabPanel({
  tab,
  active,
  children,
}: {
  tab: ManageTab
  active: ManageTab
  children: React.ReactNode
}) {
  return <div className={tab === active ? "" : "hidden md:block"}>{children}</div>
}

export function useManageTab() {
  return useState<ManageTab>("photos")
}
