import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ToolList } from "@/components/tool-list"
import { tools } from "@/lib/data"

export const metadata = { title: "Danh sách Tool - DakaTool" }

export default function ToolsPage() {
  return (
    <div>
      <PageHeader
        title="Danh sách Tool"
        description={`${tools.length} tool trong không gian làm việc. Chọn một tool để xem chi tiết và chạy.`}
        action={
          <Link href="/tools/new" className="btn-primary">
            <PlusCircle className="h-4 w-4" />
            Tạo Tool mới
          </Link>
        }
      />
      <ToolList tools={tools} />
    </div>
  )
}
