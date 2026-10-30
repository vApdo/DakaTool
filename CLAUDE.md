# DakaTool — hướng dẫn làm việc

DakaTool là bộ công cụ nội bộ dùng Next.js 14 App Router, TypeScript strict và Tailwind CSS.

## Kiến trúc

1. **Giấy đề nghị thanh toán** là tool duy nhất (`lib/payment-request.ts`, PDF ở
   `lib/pdf/payment-request.ts`, lịch sử ở `lib/payment-history/*` trên Supabase).
2. **Quản lý công trình** (`lib/construction/*`, `app/(app)/construction/*`) dùng
   PostgreSQL và storage. Mã quản lý lưu trong `AppSetting`; mọi route ghi phải gọi
   `requireManager`. Xem `docs/construction-module.md`.
3. **Marketing** (`lib/marketing/*`, `app/(app)/marketing/*`, `app/api/marketing/*`) đăng bài
   Fanpage qua Graph API bằng token System User (`FB_SYSTEM_USER_TOKEN`). Thao tác đẩy lên
   Facebook (duyệt, từ chối, huỷ lịch, xoá bài đã đăng) phải gọi `requireApprover`.
   Xem `docs/marketing-setup.md`.
4. Danh sách tool là dữ liệu tĩnh trong `lib/data.ts`. Mỗi tool phải có runner thật
   đăng ký tại `components/tool-runner-registry.tsx`.

## Lệnh thường dùng

```bash
npm run dev
npm run db:migrate
npm run typecheck
npm test
npm run build
```

Trước khi kết thúc thay đổi, chạy typecheck, test và build.
