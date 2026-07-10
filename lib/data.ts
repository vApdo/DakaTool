import type { Tool, Template, RunRecord, ToolCategory } from "./types"

export const CATEGORIES: ToolCategory[] = ["File", "Dữ liệu", "Email", "Web", "Báo cáo"]

export const tools: Tool[] = [
  {
    id: "rename-files",
    name: "Đổi tên file hàng loạt",
    description: "Đổi tên toàn bộ file trong một thư mục theo quy tắc đặt trước: thêm tiền tố, đánh số thứ tự, chuẩn hóa chữ thường.",
    category: "File",
    icon: "FolderPen",
    status: "active",
    runsCount: 128,
    lastRunAt: "2026-07-09T16:30:00",
    inputs: [
      { name: "folder", label: "Đường dẫn thư mục", type: "text", placeholder: "D:\\Documents\\Invoices", required: true },
      { name: "pattern", label: "Quy tắc đặt tên", type: "text", placeholder: "hoadon-{stt}", required: true },
      { name: "extension", label: "Chỉ áp dụng cho định dạng", type: "select", options: ["Tất cả", ".pdf", ".xlsx", ".jpg", ".png"] },
    ],
    tags: ["file", "batch"],
  },
  {
    id: "csv-to-excel",
    name: "Gộp CSV thành Excel",
    description: "Gộp nhiều file CSV thành một file Excel duy nhất, mỗi CSV một sheet, tự nhận diện encoding tiếng Việt.",
    category: "Dữ liệu",
    icon: "Table",
    status: "active",
    runsCount: 96,
    lastRunAt: "2026-07-10T09:15:00",
    inputs: [
      { name: "files", label: "Chọn các file CSV", type: "file", required: true },
      { name: "sheetNaming", label: "Đặt tên sheet theo", type: "select", options: ["Tên file", "Số thứ tự"] },
    ],
    tags: ["csv", "excel"],
  },
  {
    id: "send-report-email",
    name: "Gửi email báo cáo định kỳ",
    description: "Soạn và gửi email báo cáo theo mẫu cho danh sách người nhận, đính kèm file kết quả mới nhất.",
    category: "Email",
    icon: "Mail",
    status: "active",
    runsCount: 54,
    lastRunAt: "2026-07-10T08:00:00",
    inputs: [
      { name: "recipients", label: "Danh sách người nhận", type: "textarea", placeholder: "an@congty.vn, binh@congty.vn", required: true },
      { name: "subject", label: "Tiêu đề email", type: "text", placeholder: "Báo cáo ngày {date}", required: true },
      { name: "attachment", label: "File đính kèm", type: "file" },
    ],
    tags: ["email", "báo cáo"],
  },
  {
    id: "crawl-price",
    name: "Theo dõi giá sản phẩm",
    description: "Đọc giá sản phẩm từ danh sách link cho trước và xuất bảng so sánh giá theo ngày.",
    category: "Web",
    icon: "Globe",
    status: "active",
    runsCount: 73,
    lastRunAt: "2026-07-09T22:00:00",
    inputs: [
      { name: "urls", label: "Danh sách link sản phẩm", type: "textarea", placeholder: "Mỗi dòng một link", required: true },
      { name: "interval", label: "Số lần thử lại nếu lỗi", type: "number", placeholder: "3" },
    ],
    tags: ["crawl", "giá"],
  },
  {
    id: "compress-images",
    name: "Nén ảnh hàng loạt",
    description: "Nén và resize toàn bộ ảnh trong thư mục về kích thước chuẩn, giữ chất lượng hiển thị web.",
    category: "File",
    icon: "ImageDown",
    status: "active",
    runsCount: 41,
    lastRunAt: "2026-07-08T14:20:00",
    inputs: [
      { name: "folder", label: "Thư mục ảnh", type: "text", placeholder: "D:\\Photos\\Products", required: true },
      { name: "maxWidth", label: "Chiều rộng tối đa (px)", type: "number", placeholder: "1920" },
      { name: "quality", label: "Chất lượng", type: "select", options: ["Cao (90%)", "Vừa (75%)", "Nhẹ (60%)"] },
    ],
    tags: ["ảnh", "batch"],
  },
  {
    id: "sync-sheet",
    name: "Đồng bộ Google Sheet",
    description: "Kéo dữ liệu từ Google Sheet về file Excel nội bộ và ngược lại, đối chiếu thay đổi trước khi ghi.",
    category: "Dữ liệu",
    icon: "RefreshCw",
    status: "draft",
    runsCount: 12,
    lastRunAt: "2026-07-05T10:45:00",
    inputs: [
      { name: "sheetUrl", label: "Link Google Sheet", type: "text", placeholder: "https://docs.google.com/spreadsheets/...", required: true },
      { name: "direction", label: "Chiều đồng bộ", type: "select", options: ["Sheet → Excel", "Excel → Sheet", "Hai chiều"] },
    ],
    tags: ["sheet", "sync"],
  },
  {
    id: "weekly-summary",
    name: "Tổng hợp báo cáo tuần",
    description: "Đọc số liệu từ các file báo cáo ngày trong tuần và tạo một bản tổng hợp kèm biểu đồ.",
    category: "Báo cáo",
    icon: "BarChart3",
    status: "active",
    runsCount: 29,
    lastRunAt: "2026-07-07T17:00:00",
    inputs: [
      { name: "folder", label: "Thư mục báo cáo ngày", type: "text", placeholder: "D:\\Reports\\2026-W28", required: true },
      { name: "format", label: "Định dạng xuất", type: "select", options: ["Excel", "PDF", "Cả hai"] },
    ],
    tags: ["báo cáo", "tuần"],
  },
  {
    id: "pdf-splitter",
    name: "Tách trang PDF",
    description: "Tách file PDF nhiều trang thành từng file riêng hoặc theo khoảng trang chỉ định.",
    category: "File",
    icon: "Scissors",
    status: "draft",
    runsCount: 8,
    lastRunAt: null,
    inputs: [
      { name: "file", label: "File PDF nguồn", type: "file", required: true },
      { name: "ranges", label: "Khoảng trang (vd: 1-3, 5, 7-10)", type: "text", placeholder: "Để trống nếu tách từng trang" },
    ],
    tags: ["pdf"],
  },
]

export const templates: Template[] = [
  {
    id: "tpl-daily-report",
    name: "Quy trình báo cáo hằng ngày",
    description: "Gộp số liệu từ CSV, tạo file Excel tổng hợp rồi gửi email cho quản lý — chạy một lần mỗi cuối ngày.",
    category: "Báo cáo",
    icon: "CalendarCheck",
    steps: ["Gộp CSV thành Excel", "Tổng hợp báo cáo", "Gửi email báo cáo định kỳ"],
  },
  {
    id: "tpl-clean-folder",
    name: "Dọn dẹp thư mục dùng chung",
    description: "Chuẩn hóa tên file, nén ảnh quá nặng và gom file cũ vào thư mục lưu trữ.",
    category: "File",
    icon: "FolderCog",
    steps: ["Đổi tên file hàng loạt", "Nén ảnh hàng loạt", "Di chuyển file cũ"],
  },
  {
    id: "tpl-price-watch",
    name: "Theo dõi giá đối thủ",
    description: "Đọc giá từ danh sách link mỗi sáng, so sánh với hôm trước và cảnh báo qua email khi có thay đổi.",
    category: "Web",
    icon: "TrendingDown",
    steps: ["Theo dõi giá sản phẩm", "So sánh dữ liệu", "Gửi email cảnh báo"],
  },
  {
    id: "tpl-import-clean",
    name: "Làm sạch dữ liệu import",
    description: "Chuẩn hóa dữ liệu khách hàng từ file Excel: bỏ trùng, chuẩn số điện thoại, tách họ tên.",
    category: "Dữ liệu",
    icon: "Sparkles",
    steps: ["Đọc file Excel", "Chuẩn hóa dữ liệu", "Xuất file sạch"],
  },
  {
    id: "tpl-invoice-archive",
    name: "Lưu trữ hóa đơn",
    description: "Tách PDF hóa đơn theo trang, đổi tên theo mã hóa đơn và sắp vào thư mục theo tháng.",
    category: "File",
    icon: "Archive",
    steps: ["Tách trang PDF", "Đổi tên file hàng loạt", "Phân loại theo tháng"],
  },
  {
    id: "tpl-sheet-backup",
    name: "Sao lưu Google Sheet",
    description: "Kéo toàn bộ dữ liệu Sheet quan trọng về file Excel nội bộ vào mỗi tối thứ Sáu.",
    category: "Dữ liệu",
    icon: "DatabaseBackup",
    steps: ["Đồng bộ Google Sheet", "Nén file sao lưu", "Ghi log kết quả"],
  },
]

export const runs: RunRecord[] = [
  {
    id: "run-1024",
    toolId: "csv-to-excel",
    toolName: "Gộp CSV thành Excel",
    status: "running",
    startedAt: "2026-07-10T09:15:00",
    durationSeconds: null,
    summary: "Đang xử lý 14 file CSV...",
    runBy: "Vita",
  },
  {
    id: "run-1023",
    toolId: "send-report-email",
    toolName: "Gửi email báo cáo định kỳ",
    status: "success",
    startedAt: "2026-07-10T08:00:00",
    durationSeconds: 12,
    summary: "Đã gửi 5 email, đính kèm bao-cao-2026-07-09.xlsx",
    runBy: "Hệ thống (lịch)",
  },
  {
    id: "run-1022",
    toolId: "crawl-price",
    toolName: "Theo dõi giá sản phẩm",
    status: "success",
    startedAt: "2026-07-09T22:00:00",
    durationSeconds: 340,
    summary: "Đọc 86/86 link, 3 sản phẩm thay đổi giá",
    runBy: "Hệ thống (lịch)",
  },
  {
    id: "run-1021",
    toolId: "rename-files",
    toolName: "Đổi tên file hàng loạt",
    status: "success",
    startedAt: "2026-07-09T16:30:00",
    durationSeconds: 4,
    summary: "Đổi tên 212 file trong D:\\Documents\\Invoices",
    runBy: "Vita",
  },
  {
    id: "run-1020",
    toolId: "sync-sheet",
    toolName: "Đồng bộ Google Sheet",
    status: "failed",
    startedAt: "2026-07-09T11:05:00",
    durationSeconds: 8,
    summary: "Không truy cập được Sheet: hết hạn quyền chia sẻ. Cấp lại quyền rồi chạy lại.",
    runBy: "Vita",
  },
  {
    id: "run-1019",
    toolId: "compress-images",
    toolName: "Nén ảnh hàng loạt",
    status: "success",
    startedAt: "2026-07-08T14:20:00",
    durationSeconds: 95,
    summary: "Nén 340 ảnh, giảm 68% dung lượng (1.2GB → 384MB)",
    runBy: "Vita",
  },
  {
    id: "run-1018",
    toolId: "weekly-summary",
    toolName: "Tổng hợp báo cáo tuần",
    status: "success",
    startedAt: "2026-07-07T17:00:00",
    durationSeconds: 27,
    summary: "Tạo bao-cao-tuan-W28.xlsx từ 7 file báo cáo ngày",
    runBy: "Hệ thống (lịch)",
  },
  {
    id: "run-1017",
    toolId: "crawl-price",
    toolName: "Theo dõi giá sản phẩm",
    status: "failed",
    startedAt: "2026-07-07T22:00:00",
    durationSeconds: 610,
    summary: "12/86 link không phản hồi. Đã lưu kết quả 74 link còn lại.",
    runBy: "Hệ thống (lịch)",
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
