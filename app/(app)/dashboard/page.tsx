import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DashboardContent } from "@/components/dashboard-content"

export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tình hình các tool tự động hóa của bạn trên trình duyệt này."
        action={
          <Link href="/tools/new" className="btn-primary">
            <PlusCircle className="h-4 w-4" />
            Tạo Tool mới
          </Link>
        }
      />
      <DashboardContent />
    </div>
  )
}
