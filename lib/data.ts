import type { Tool, ToolCategory } from "./types"

export const CATEGORIES: ToolCategory[] = ["PDF", "Chứng từ"]

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
  {
    id: "hbl-pdf-extractor",
    name: "Trích xuất dữ liệu HBL từ PDF",
    description:
      "Tải lên file PDF House Bill of Lading, hệ thống đọc và trích xuất các trường quan trọng (HBL No, Shipper, Consignee, Container, cảng đi/đến...) để kiểm tra, sửa và xuất kết quả. Xử lý ngay trong trình duyệt.",
    category: "Chứng từ",
    icon: "FileSearch",
    status: "active",
    inputs: [{ name: "file", label: "File PDF HBL", type: "file", required: true }],
    tags: ["hbl", "pdf", "bill of lading", "chứng từ"],
  },
  {
    id: "pdf-splitter",
    name: "Tách trang PDF",
    description:
      "Tách file PDF nhiều trang thành từng file riêng hoặc theo khoảng trang chỉ định. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "Scissors",
    status: "active",
    inputs: [
      { name: "file", label: "File PDF nguồn", type: "file", required: true },
      { name: "ranges", label: "Khoảng trang (vd: 1-3, 5, 7-10)", type: "text", placeholder: "Để trống nếu tách từng trang" },
    ],
    tags: ["pdf", "tách trang"],
  },
  {
    id: "pdf-merge",
    name: "Ghép PDF",
    description:
      "Ghép nhiều file PDF thành một file duy nhất theo thứ tự bạn sắp xếp — tiện gộp Invoice, Packing List, B/L thành một bộ chứng từ. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "Combine",
    status: "active",
    inputs: [{ name: "files", label: "Các file PDF cần ghép", type: "file", required: true }],
    tags: ["pdf", "ghép file", "chứng từ"],
  },
  {
    id: "pdf-organize",
    name: "Sắp xếp trang PDF",
    description:
      "Xoay, xóa và đổi thứ tự trang PDF bằng lưới ảnh xem trước, rồi xuất file mới. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "LayoutGrid",
    status: "active",
    inputs: [{ name: "file", label: "File PDF nguồn", type: "file", required: true }],
    tags: ["pdf", "xoay trang", "xóa trang"],
  },
  {
    id: "images-to-pdf",
    name: "Ảnh sang PDF",
    description:
      "Ghép nhiều ảnh JPG/PNG (vd chụp chứng từ bằng điện thoại) thành một file PDF, mỗi ảnh một trang. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "Images",
    status: "active",
    inputs: [{ name: "files", label: "Các file ảnh", type: "file", required: true }],
    tags: ["pdf", "ảnh", "scan"],
  },
  {
    id: "pdf-to-images",
    name: "PDF sang ảnh",
    description:
      "Xuất từng trang PDF thành ảnh PNG hoặc JPG để chèn vào email, chat hay tài liệu khác. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "FileImage",
    status: "active",
    inputs: [{ name: "file", label: "File PDF nguồn", type: "file", required: true }],
    tags: ["pdf", "ảnh", "png", "jpg"],
  },
  {
    id: "pdf-watermark",
    name: "Đóng dấu / Watermark PDF",
    description:
      'Đóng chữ mờ như "COPY", "DRAFT" hay tên công ty lên mọi trang PDF, hỗ trợ tiếng Việt có dấu. Xử lý ngay trong trình duyệt.',
    category: "PDF",
    icon: "Stamp",
    status: "active",
    inputs: [
      { name: "file", label: "File PDF nguồn", type: "file", required: true },
      { name: "text", label: "Nội dung dấu", type: "text", placeholder: "COPY", required: true },
    ],
    tags: ["pdf", "watermark", "đóng dấu"],
  },
  {
    id: "pdf-page-numbers",
    name: "Đánh số trang PDF",
    description:
      "Thêm số trang vào PDF với vị trí và kiểu hiển thị tùy chọn (1, 1/10, Trang 1/10...). Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "Hash",
    status: "active",
    inputs: [{ name: "file", label: "File PDF nguồn", type: "file", required: true }],
    tags: ["pdf", "số trang"],
  },
  {
    id: "pdf-sign",
    name: "Ký tên lên PDF",
    description:
      "Vẽ chữ ký trực tiếp hoặc dùng ảnh chữ ký có sẵn, chọn trang và vị trí rồi chèn vào PDF. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "PenLine",
    status: "active",
    inputs: [{ name: "file", label: "File PDF cần ký", type: "file", required: true }],
    tags: ["pdf", "chữ ký"],
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
