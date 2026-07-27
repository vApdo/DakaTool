import Link from "next/link"
import { Wrench } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DashboardContent } from "@/components/dashboard-content"

export const metadata = { title: "Dashboard - DakaTool" }

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tình hình các tool tự động hóa của bạn trên trình duyệt này."
        action={
          <Link href="/tools" className="btn-primary">
            <Wrench className="h-4 w-4" />
            Xem danh sách Tool
          </Link>
        }
      />
      <DashboardContent />
    </div>
  )
}
