import { PageHeader } from "@/components/page-header"
import { ToolCreateForm } from "@/components/tool-create-form"

export const metadata = { title: "Tạo Tool mới" }

export default function NewToolPage() {
  return (
    <div>
      <PageHeader
        title="Tạo Tool mới"
        description="Mô tả công việc lặp lại thành một tool có form nhập liệu. Bản MVP lưu tạm trong phiên, chưa ghi vào hệ thống."
      />
      <ToolCreateForm />
    </div>
  )
}
