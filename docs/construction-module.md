# Quản lý công trình (Xưởng cơ khí HQT)

Nhánh chức năng theo dõi tiến độ thi công: ban lãnh đạo **xem**, quản lý cấp trung
**cập nhật**. Dùng chung hạ tầng đã có (Postgres/Prisma + storage adapter), không
cần queue/worker.

## Hai vai trò, hai trang

| Trang | Ai dùng | Quyền |
|---|---|---|
| `/construction` | Mọi người trong mạng nội bộ | Xem danh sách công trình |
| `/construction/[id]` | **Ban lãnh đạo** | Xem: nhật ký ảnh, tiến độ hạng mục, dự toán chi phí, tài liệu |
| `/construction/[id]/manage` | **Quản lý cấp trung** | Nhập liệu — **cần mã truy cập** |

## Mã truy cập (chưa có hệ thống tài khoản)

- Mã lưu server-side trong bảng `AppSetting` (key `construction.managerCode`),
  **không bao giờ** trả về trình duyệt.
- **Lần đầu:** mở `/construction/<id>/manage` → màn hình "Đặt mã quản lý" → mã nhập
  vào trở thành mã dùng chung cho tất cả quản lý.
- Nhập đúng mã → cookie HttpOnly `hqt_manager` (chứa HMAC của mã, hạn 30 ngày).
- Đổi mã → mọi cookie cũ tự hết hiệu lực.
- Mọi API **ghi** đều qua `requireManager()`; API **đọc** mở tự do.

> Đây là kiểm soát nội bộ mức đơn giản, phù hợp mạng LAN công ty. Nếu cần truy vết
> từng người hoặc mở ra Internet, phải nâng lên hệ thống tài khoản thật.

## Dữ liệu (prisma/schema.prisma)

- `ConstructionProject` — công trình (tên, trạng thái, ngày bắt đầu/mục tiêu).
- `ConstructionUpdate` + `ConstructionPhoto` — nhật ký: mỗi lần đăng gồm chú thích
  chung + nhiều ảnh, mỗi ảnh có caption riêng.
- `ConstructionMilestone` — hạng mục: tên, ngày kế hoạch, trạng thái, % hoàn thành.
- `ConstructionCostItem` — chi phí: dự toán / đã chi (BigInt VND) + ghi chú.
- `ConstructionFile` — tài liệu đính kèm (bản vẽ, dự toán).

Số liệu tổng hợp tính khi đọc: **tiến độ tổng** = trung bình % các hạng mục;
**ngân sách đã dùng** = tổng đã chi / tổng dự toán.

## API (`app/api/construction/…`)

Đọc (mở): `GET /projects`, `GET /projects/:id`, `GET /media/:photoId`,
`GET /files/:fileId/download`.

Ghi (cần mã): `POST /projects`, `PATCH /projects/:id`,
`POST /projects/:id/updates` (multipart ảnh), `DELETE /updates/:id`,
`PATCH /projects/:id/milestones`, `PATCH /projects/:id/costs`,
`POST /projects/:id/files`.

Xác thực mã: `GET|POST /auth`.

## An toàn khi upload

- Ảnh: xác minh **magic bytes** (JPEG/PNG/WebP) — không tin MIME/đuôi từ client;
  tối đa 10 ảnh/lần, 10MB/ảnh.
- Tài liệu: chỉ `.pdf .xls .xlsx .doc .docx .csv`, tối đa 25MB.
- Key lưu trữ **do server sinh** (`construction/<projectId>/…`), chống path traversal.
- Ảnh được **nén phía trình duyệt** trước khi gửi (cạnh dài ≤ 1920px, JPEG 85%) —
  ảnh điện thoại 8MB thường còn dưới 1MB.

## Seed

`npm run db:seed` tạo sẵn (idempotent) công trình **"Xưởng cơ khí HQT"** với 7 hạng
mục khung: san lấp → móng → khung thép → mái/bao che → nền & hạ tầng → điện/nước/PCCC
→ hoàn thiện. Chạy lại nhiều lần không tạo trùng.

## Dùng thử nhanh

```bash
npm run db:migrate && npm run db:seed
npm run dev
```
Mở `http://localhost:3000/construction`.
