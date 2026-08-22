# CLAUDE.md — Hướng dẫn cho Claude Code khi làm việc trong repo DakaTool

DakaTool là bộ công cụ nội bộ (Next.js 14 App Router, TypeScript strict, Tailwind).

## Hai loại công cụ — đừng trộn lẫn kiến trúc
1. **Công cụ PDF & tiện ích** (`lib/pdf/*`, `components/pdf/*`): chạy **hoàn toàn
   client-side** trong trình duyệt, không backend, không DB. Giữ nguyên như vậy.
2. **Auto Subtitle** (`lib/auto-subtitle/*`, `workers/*`, `services/subtitle-engine/*`):
   luồng động cần Postgres + Redis + worker + engine Python. Xem
   `docs/auto-subtitle-architecture.md`.
## Quy tắc bắt buộc cho Auto Subtitle
- Node worker gọi Python bằng `spawn(bin, [args], { shell: false })`. **Cấm**
  `exec(\`python ${input}\`)` và `shell: true`.
- Python engine (`services/subtitle-engine`) **không truy cập DB**. Chỉ đọc file vào,
  ghi file ra, phát tiến độ **JSON Lines trên stdout**, log ra stderr.
- Validate mọi input API bằng Zod ở biên (`lib/auto-subtitle/schemas.ts`).
- Truy cập DB qua `lib/auto-subtitle/repository.ts` (đã gồm kiểm quyền + chống job trùng),
  không gọi Prisma trực tiếp trong route handler.
- Không tin MIME/đuôi file client — xác minh bằng ffprobe.
- Key storage do server sinh (`buildStorageKey`), không nhận key thô từ client.
- Không nhúng tag/override ASS của người dùng vào phụ đề (escape).

## Thư viện Tool
Danh sách công cụ là **tĩnh** trong `lib/data.ts` (không phải DB). Thêm công cụ mới =
thêm phần tử vào mảng `tools` (idempotent), không xoá công cụ cũ.

## Lệnh hay dùng
```bash
npm run dev                 # UI + API
npm run worker:subtitle     # worker Auto Subtitle
npm run db:migrate          # prisma migrate deploy
npm run typecheck           # tsc --noEmit
npm test                    # vitest (TS)
npm run test:subtitle-engine# pytest (Python engine)
```

## Trước khi kết thúc thay đổi
Chạy `npm run typecheck`, `npm test`, `npm run test:subtitle-engine` và `npm run build`.
Không commit/push khi chưa được yêu cầu.
