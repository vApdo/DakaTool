import type { Tool, ToolCategory } from "./types"

export const CATEGORIES: ToolCategory[] = ["Chứng từ"]

/**
 * Danh sách tool THẬT — mọi tool ở đây đều có runner hoạt động trong
 * components/tool-runner-registry.tsx.
 * Không đưa tool chưa làm xong vào đây: trang chủ và dashboard đếm trực tiếp
 * từ mảng này để quảng bá, sai là quảng cáo láo.
 */
export const tools: Tool[] = [
  {
    id: "payment-request",
    name: "Giấy đề nghị thanh toán",
    description:
      "Nhập thông tin đề nghị và danh sách hàng hóa theo Mẫu số 05 - TT, tự tính tổng tiền và số tiền bằng chữ, sau đó tải PDF hoặc in trực tiếp trên trình duyệt.",
    category: "Chứng từ",
    icon: "ReceiptText",
    status: "active",
    inputs: [
      { name: "requester", label: "Người đề nghị", type: "text", required: true },
      { name: "department", label: "Bộ phận", type: "text", required: true },
      { name: "items", label: "Danh sách hàng hóa", type: "textarea", required: true },
    ],
    tags: ["thanh toán", "mẫu 05-TT", "chứng từ", "pdf", "in biểu mẫu"],
  },
]

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id)
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Chưa chạy lần nào"
  const d = new Date(iso)
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  if (seconds < 60) return `${seconds} giây`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} phút ${s} giây` : `${m} phút`
}
