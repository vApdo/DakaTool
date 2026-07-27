import { PageHeader } from "@/components/page-header"
import { RunHistoryTable } from "@/components/run-history-table"

export const metadata = { title: "Lịch sử chạy - DakaTool" }

export default function HistoryPage() {
  return (
    <div>
      <PageHeader
        title="Lịch sử chạy Tool"
        description="Các lần chạy tool thật trên trình duyệt của bạn: chạy lúc nào, mất bao lâu và kết quả ra sao."
      />

      <RunHistoryTable />
    </div>
  )
}
