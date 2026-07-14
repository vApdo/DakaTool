import type { Tool, Template, ToolCategory } from "./types"

export const CATEGORIES: ToolCategory[] = ["PDF", "File", "Dữ liệu", "Email", "Web", "Báo cáo", "Chứng từ"]

export const tools: Tool[] = [
  {
    id: "hbl-pdf-extractor",
    name: "Trích xuất dữ liệu HBL từ PDF",
    description:
      "Tải lên file PDF House Bill of Lading, hệ thống đọc và trích xuất các trường quan trọng (HBL No, Shipper, Consignee, Container, cảng đi/đến...) để kiểm tra, sửa và xuất kết quả. Xử lý ngay trong trình duyệt.",
    category: "Chứng từ",
    icon: "FileSearch",
    status: "active",
    runsCount: 0,
    lastRunAt: null,
    inputs: [{ name: "file", label: "File PDF HBL", type: "file", required: true }],
    tags: ["hbl", "pdf", "bill of lading", "chứng từ"],
  },
  {
    id: "rename-files",
    name: "Đổi tên file hàng loạt",
    description: "Đổi tên toàn bộ file trong một thư mục theo quy tắc đặt trước: thêm tiền tố, đánh số thứ tự, chuẩn hóa chữ thường.",
    category: "File",
    icon: "FolderPen",
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
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
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
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
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
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
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
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
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    status: "draft",
    runsCount: 0,
    lastRunAt: null,
    inputs: [
      { name: "folder", label: "Thư mục báo cáo ngày", type: "text", placeholder: "D:\\Reports\\2026-W28", required: true },
      { name: "format", label: "Định dạng xuất", type: "select", options: ["Excel", "PDF", "Cả hai"] },
    ],
    tags: ["báo cáo", "tuần"],
  },
  {
    id: "pdf-splitter",
    name: "Tách trang PDF",
    description:
      "Tách file PDF nhiều trang thành từng file riêng hoặc theo khoảng trang chỉ định. Xử lý ngay trong trình duyệt.",
    category: "PDF",
    icon: "Scissors",
    status: "active",
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
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
    runsCount: 0,
    lastRunAt: null,
    inputs: [{ name: "file", label: "File PDF cần ký", type: "file", required: true }],
    tags: ["pdf", "chữ ký"],
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
