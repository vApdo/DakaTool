import { PageHeader } from "@/components/page-header"
import { ToolList } from "@/components/tool-list"
import { tools } from "@/lib/data"

export const metadata = { title: "Danh sách Tool - DakaTool" }

export default function ToolsPage() {
  return (
    <div>
      <PageHeader
        title="Danh sách Tool"
        description={`${tools.length} tool đang hoạt động. Chọn một tool để xem chi tiết và chạy.`}
      />
      <ToolList tools={tools} />
    </div>
  )
}
