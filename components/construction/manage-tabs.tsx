"use client"

import { useState, type ComponentType } from "react"
import { CircleDollarSign, ClipboardPenLine, ListChecks } from "lucide-react"

export type ManageTab = "photos" | "progress" | "costs"

const TABS: Array<{
  id: ManageTab
  label: string
  shortLabel: string
  icon: ComponentType<{ className?: string }>
}> = [
  { id: "photos", label: "Cập nhật nhanh", shortLabel: "Cập nhật", icon: ClipboardPenLine },
  { id: "progress", label: "Thiết lập hạng mục", shortLabel: "Hạng mục", icon: ListChecks },
  { id: "costs", label: "Chi phí & tài liệu", shortLabel: "Chi phí", icon: CircleDollarSign },
]

/** Mỗi lần chỉ mở một tác vụ để form hằng ngày không bị lẫn với phần thiết lập. */
export function ManageTabs({
  value,
  onChange,
}: {
  value: ManageTab
  onChange: (tab: ManageTab) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Chọn nội dung quản lý công trình"
      className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-800/60"
    >
      {TABS.map((tab) => {
        const active = tab.id === value
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            id={`manage-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`manage-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              active
                ? "bg-white text-gray-950 shadow-sm dark:bg-gray-950 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  tab,
  active,
  children,
}: {
  tab: ManageTab
  active: ManageTab
  children: React.ReactNode
}) {
  if (tab !== active) return null
  return (
    <div id={`manage-panel-${tab}`} role="tabpanel" aria-labelledby={`manage-tab-${tab}`}>
      {children}
    </div>
  )
}

export function useManageTab() {
  return useState<ManageTab>("photos")
}
