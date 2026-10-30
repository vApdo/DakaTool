# DakaTool

Nền tảng nội bộ để tạo, quản lý và chạy các tool xử lý công việc — hiện có một tool: **Giấy đề nghị thanh toán** (Mẫu 05-TT).

## Yêu cầu & lệnh

Khuyến nghị **Node.js 20 LTS** (CI dùng Node 20).

```bash
npm install         # cài phụ thuộc
npm run dev         # chạy dev tại http://localhost:3000
npm test            # unit test (vitest)
npx tsc --noEmit    # kiểm tra kiểu TypeScript
npm run lint        # ESLint (next/core-web-vitals + @typescript-eslint)
npm run build       # build production
```

> Lint dùng quy tắc **có đọc kiểu** (`parserOptions.project`), nên bắt được cả những lỗi
> mà kiểm tra cú pháp thường bỏ qua — đáng kể nhất là `no-floating-promises`: quên `await`
> trước một hàm async khiến code chạy tiếp mà không chờ, kiểu vẫn đúng nên `tsc` im lặng.
> Quy tắc `no-misused-promises` được nới ở thuộc tính JSX (`onClick={handleAsync}` là cách
> viết bình thường của React); mọi chỗ khác vẫn bị chặn.

## Tool

| Tool | Chức năng |
|---|---|
| Giấy đề nghị thanh toán | Nhập người đề nghị, bộ phận, công ty và danh sách hàng hóa theo Mẫu 05-TT; tự tính tổng và số tiền bằng chữ; tải PDF (pdf-lib, font tự host ở `public/fonts/`) hoặc in. Lịch sử đề nghị lưu trên Supabase. |

**Marketing** (`/marketing`, ngoài danh sách tool): soạn bài Fanpage, trưởng nhóm duyệt bằng mã duyệt riêng, đăng ngay hoặc hẹn giờ qua Graph API. Cài đặt: [docs/marketing-setup.md](docs/marketing-setup.md).

Các tool PDF và trích xuất HBL trước đây đã được gỡ khỏi repo.

## Kiến trúc

- **Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS**, deploy trên Vercel.
- Logic tính tiền/đọc số ở `lib/payment-request.ts`; dựng PDF phiếu ở `lib/pdf/payment-request.ts`;
  lịch sử đề nghị ở `lib/payment-history/` và `app/api/payment-requests`.
- Marketing ở `lib/marketing/` (client Graph API `facebook.ts`, Fanpage đã kết nối `connections.ts`, quy tắc trạng thái `workflow.ts`, mã duyệt `approver.ts`), API `app/api/marketing/*`, giao diện `app/(app)/marketing/*`.
- Mỗi tool có runner riêng qua registry `components/tool-runner-registry.tsx`.
- Khu vực app dùng route group `app/(app)/` với sidebar chung; homepage nằm ngoài.
- Không commit chứng từ thật vào repo (`test/fixtures/*.pdf` bị `.gitignore`).

## Test & CI

- Unit test ở `test/` (vitest).
- GitHub Actions (`.github/workflows/ci.yml`) chạy khi push nhánh phụ hoặc PR vào `main`:
  `npm ci` → `tsc --noEmit` → `npm test` → `npm run build`.

## Quy trình đưa code lên

1. Làm việc trên **nhánh phụ** (không push trực tiếp vào `main`).
2. Mở Pull Request → Vercel tạo **Preview** để kiểm tra.
3. Chỉ **merge vào `main` khi được người dùng duyệt rõ ràng**.

## Định hướng

1. **Giai đoạn 1 (hiện tại):** dùng cá nhân, dữ liệu mẫu.
2. **Giai đoạn 2:** mở cho nhân viên nội bộ (cần backend + auth nội bộ).
3. **Giai đoạn 3:** cân nhắc thương mại hóa.

Không làm ở giai đoạn này: SaaS công khai, thanh toán, marketplace.
