# Deploy Auto Subtitle trên VPS (Docker Compose)

Auto Subtitle cần backend chạy liên tục (Next UI+API, worker, Postgres, Redis, Python
+ FFmpeg + whisper), **không chạy trên Vercel tĩnh**. Hướng dẫn này dựng toàn bộ trên
một VPS bằng Docker Compose.

## 1. Yêu cầu VPS
- Ubuntu/Debian, tối thiểu **2 vCPU / 4 GB RAM** (whisper `small` chạy CPU). Muốn nhanh
  hơn với video dài: 4+ vCPU hoặc máy có GPU (đổi `WHISPER_DEVICE=cuda`).
- Dung lượng đĩa cho model whisper (~0.5–3 GB tùy model) + video tạm.
- Docker Engine + plugin Compose:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

## 2. Lấy mã & cấu hình
```bash
git clone <repo-url> dakatool && cd dakatool
git checkout feat/auto-subtitle          # nhánh chứa Auto Subtitle
cp .env.example .env
```
Sửa `.env` — **bắt buộc đổi `POSTGRES_PASSWORD`**. Chọn model whisper theo nhu cầu:
`WHISPER_MODEL=small` (mặc định, cân bằng) hoặc `tiny/base` (nhanh, kém chính xác) /
`medium/large-v3` (chính xác, chậm & tốn RAM). Với tiếng Việt nên để tối thiểu `small`.

> Compose tự sinh `DATABASE_URL`/`REDIS_URL` cho container từ `POSTGRES_*`; bạn không cần
> sửa hai biến đó trong `.env` khi deploy bằng compose.

## 3. Khởi động
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
- Lần đầu build lâu (cài Python/FFmpeg, `npm ci`, `next build`).
- Service `app` tự chạy `prisma migrate deploy` trước khi bật Next.
- App lắng nghe cổng **3000**. Kiểm tra:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  curl -I http://localhost:3000/tools/auto-subtitle
  ```
- Lần transcribe đầu tiên, worker tải model whisper về volume `models` (chỉ tải một lần).
  Xem log: `docker compose -f docker-compose.prod.yml logs -f worker`.

## 4. HTTPS qua reverse proxy (Caddy — gọn nhất)
`/etc/caddy/Caddyfile`:
```
sub.tenmien.com {
    reverse_proxy localhost:3000
    request_body {
        max_size 1024MB     # khớp MAX_VIDEO_SIZE_BYTES (1GB) cho upload video
    }
}
```
Caddy tự cấp chứng chỉ Let's Encrypt. Nếu dùng Nginx, nhớ đặt
`client_max_body_size 1024m;` để không chặn upload video lớn.

## 5. Vận hành
- **Cập nhật:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
  (migration mới chạy tự động khi `app` khởi động lại).
- **Log:** `docker compose -f docker-compose.prod.yml logs -f app worker`.
- **Sao lưu DB:**
  ```bash
  docker compose -f docker-compose.prod.yml exec postgres \
    pg_dump -U postgres dakatool > backup-$(date +%F).sql
  ```
- **Dữ liệu bền** nằm ở các volume: `pgdata` (DB), `storage` (video + file phụ đề),
  `models` (cache whisper), `redisdata` (hàng đợi).

## 6. Điều chỉnh hiệu năng / giới hạn
- `WORKER_CONCURRENCY=1` giữ mặc định để không transcribe hai video song song (tránh cạn RAM).
  Máy mạnh có thể tăng, nhưng theo dõi RAM.
- `MAX_VIDEO_SIZE_BYTES`, `MAX_VIDEO_DURATION_SECONDS`, `JOB_TIMEOUT_MS` chỉnh trong `.env`.
- Lưu trữ đám mây thay đĩa: đặt `STORAGE_DRIVER=s3` + các biến `S3_*` (tương thích
  AWS S3 / Cloudflare R2 / MinIO). Khi đó bỏ mount volume `storage` cũng được.

## 7. Kiểm tra sức khỏe nhanh
```bash
# DB ok?
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
# Redis ok?
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Engine Python + ffmpeg trong image?
docker compose -f docker-compose.prod.yml exec worker /opt/venv/bin/python -m subtitle_engine.cli --help
docker compose -f docker-compose.prod.yml exec worker ffmpeg -version | head -1
```
