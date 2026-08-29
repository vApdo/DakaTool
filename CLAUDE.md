# DakaTool — hướng dẫn làm việc

DakaTool là bộ công cụ nội bộ dùng Next.js 14 App Router, TypeScript strict và Tailwind CSS.

## Kiến trúc

1. **Công cụ PDF** (`lib/pdf/*`, `components/pdf/*`) chạy hoàn toàn client-side,
   không backend và không database.
2. **Quản lý công trình** (`lib/construction/*`, `app/(app)/construction/*`) dùng
   PostgreSQL và storage. Mã quản lý lưu trong `AppSetting`; mọi route ghi phải gọi
   `requireManager`. Xem `docs/construction-module.md`.
3. Danh sách tool là dữ liệu tĩnh trong `lib/data.ts`. Mỗi tool phải có runner thật
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
