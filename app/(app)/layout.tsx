import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MobileNav />
      <div className="flex">
        <div className="hidden md:block w-60 shrink-0 sticky top-0 h-screen">
          <AppSidebar />
        </div>
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
