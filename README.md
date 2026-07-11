# DakaTool

Nền tảng nội bộ để tạo, quản lý và chạy các tool/quy trình tự động hóa công việc.

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production
npm test         # unit test (vitest) cho logic trích xuất PDF
```

## Các trang (MVP 0.1)

| Đường dẫn | Nội dung |
|---|---|
| `/` | Homepage giới thiệu DakaTool |
| `/dashboard` | Tổng quan: thống kê, lần chạy gần đây, tool dùng nhiều |
| `/tools` | Danh sách tool, tìm kiếm + lọc theo nhóm |
| `/tools/[id]` | Chi tiết tool + form chạy (mô phỏng tiến trình) |
| `/tools/new` | Tạo tool mới (form builder, chưa lưu thật) |
| `/templates` | Thư viện template quy trình dựng sẵn |
| `/history` | Lịch sử các lần chạy |
| `/export` | Export kết quả (placeholder) |

## Tool thật đầu tiên: Trích xuất dữ liệu HBL từ PDF

`/tools/hbl-pdf-extractor` — tool chạy thật (không mô phỏng): tải PDF House Bill of Lading lên, hệ thống đọc text layer bằng pdfjs-dist ngay trong trình duyệt (không upload đi đâu), trích xuất 23 trường nghiệp vụ, cho sửa từng trường, sao chép và xuất JSON. PDF scan (không có text layer) được phát hiện và báo "cần OCR" — kiến trúc OCR provider đã chuẩn bị sẵn ở `lib/pdf/ocr-provider.ts`.

- Logic parsing tách khỏi UI: `lib/pdf/` (extract-text, classify-pdf, extract-hbl, normalize-fields).
- Runner riêng cho từng tool qua registry: `components/tool-runner-registry.tsx` — tool chưa có runner thật dùng ToolRunner mô phỏng.
- Unit test + fixture PDF thật: `test/pdf/`, chạy bằng `npm test`.

## Kiến trúc

- **Next.js 14 App Router + TypeScript + Tailwind CSS**
- Chưa có database — toàn bộ dữ liệu mẫu nằm ở `lib/data.ts`, types ở `lib/types.ts`. Khi kết nối backend, chỉ cần thay nguồn dữ liệu ở đây.
- Khu vực app dùng route group `app/(app)/` với sidebar chung; homepage nằm ngoài.
- Design system kế thừa từ giao diện gốc: font Outfit, màu chủ đạo `#7A7FEE`, card `rounded-3xl`, hỗ trợ light/dark (next-themes). Token màu và class dùng chung (`.card`, `.btn-primary`, `.field-input`...) ở `app/globals.css`.

## Định hướng

1. **Giai đoạn 1 (hiện tại):** dùng cá nhân, dữ liệu mẫu.
2. **Giai đoạn 2:** mở cho nhân viên nội bộ (cần backend + auth nội bộ).
3. **Giai đoạn 3:** cân nhắc thương mại hóa.

Không làm ở giai đoạn này: SaaS công khai, thanh toán, marketplace.
