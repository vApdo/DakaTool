#!/usr/bin/env bash
# Entrypoint cho image DakaTool. Chọn vai trò qua tham số:
#   app    → chạy migration Prisma rồi khởi động Next (UI + API)
#   worker → chạy worker Auto Subtitle (tiêu thụ queue)
# Mọi tham số khác được thực thi nguyên văn (tiện debug: `docker compose run app bash`).
set -euo pipefail

role="${1:-app}"

case "$role" in
  app)
    echo "[entrypoint] Áp migration Prisma (migrate deploy)…"
    npx prisma migrate deploy
    # Seed idempotent (tạo sẵn công trình mẫu nếu chưa có). Lỗi seed không được
    # chặn app khởi động.
    echo "[entrypoint] Chạy seed dữ liệu khởi tạo…"
    npm run db:seed || echo "[entrypoint] Bỏ qua seed (lỗi không nghiêm trọng)."
    echo "[entrypoint] Khởi động Next trên cổng ${PORT:-3000}…"
    exec npm run start -- -p "${PORT:-3000}"
    ;;
  worker)
    echo "[entrypoint] Khởi động worker Auto Subtitle…"
    exec npm run worker:subtitle
    ;;
  *)
    exec "$@"
    ;;
esac
