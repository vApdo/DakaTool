import { AccessGate } from "@/components/access-gate"
import { PageHeader } from "@/components/page-header"
import { PaymentRequestHistoryPanel } from "@/components/payment-request-history-panel"
import { RunHistoryTable } from "@/components/run-history-table"

export const metadata = { title: "Lịch sử - DakaTool" }

export default function HistoryPage() {
  return (
    <div>
      <PageHeader
        title="Lịch sử"
        description="Xem lại các phiếu thanh toán đã xuất, dùng lại dữ liệu cũ và theo dõi những lần chạy tool trên thiết bị này."
      />

      <section aria-labelledby="payment-history-title">
        <h2 id="payment-history-title" className="mb-1 text-lg font-semibold text-black dark:text-white">Phiếu thanh toán đã lưu</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Tự động lưu trên Supabase mỗi lần tải PDF hoặc in.</p>
        <AccessGate>
          <PaymentRequestHistoryPanel />
        </AccessGate>
      </section>

      <section aria-labelledby="device-history-title" className="mt-10">
        <h2 id="device-history-title" className="mb-1 text-lg font-semibold text-black dark:text-white">Lần chạy trên thiết bị này</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Thông tin kỹ thuật của các tool, chỉ lưu trong trình duyệt hiện tại.</p>
        <RunHistoryTable />
      </section>
    </div>
  )
}
