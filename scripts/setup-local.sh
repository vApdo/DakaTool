#!/usr/bin/env bash
# Cài đặt & khởi động DakaTool trên Ubuntu (WSL2) bằng MỘT lệnh:
#
#   curl -fsSL https://raw.githubusercontent.com/vApdo/DakaTool/main/scripts/setup-local.sh | bash
#
# Cài DakaTool và Auto Subtitle. Muốn dùng nhánh khác:
#   DAKATOOL_BRANCH=feat/auto-subtitle bash -c "$(curl -fsSL .../setup-local.sh)"
#
# Script idempotent — chạy lại lần sau chỉ cập nhật code và bật lại app.
set -euo pipefail

REPO_URL="https://github.com/vApdo/DakaTool"
BRANCH="${DAKATOOL_BRANCH:-main}"
DIR="$HOME/dakatool"
COMPOSE_FILE="docker-compose.prod.yml"

msg() { echo; echo "==> $*"; }

msg "Bước 1/5 — Kiểm tra Docker"
if ! command -v docker >/dev/null 2>&1; then
  msg "Chưa có Docker. Cài đặt (Ubuntu sẽ hỏi mật khẩu sudo của bạn)…"
  curl -fsSL https://get.docker.com | sudo sh
fi
if ! sudo docker info >/dev/null 2>&1; then
  sudo service docker start >/dev/null 2>&1 || sudo systemctl start docker >/dev/null 2>&1 || true
  for _ in $(seq 1 15); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 2
  done
fi
if ! sudo docker info >/dev/null 2>&1; then
  echo "❌ Docker không khởi động được. Chụp màn hình lỗi này gửi lại để được hỗ trợ."
  exit 1
fi
echo "Docker OK."

msg "Bước 2/5 — Lấy mã nguồn về $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH"
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$DIR"
fi
cd "$DIR"

msg "Bước 3/5 — Tạo cấu hình .env"
if [ ! -f .env ]; then
  cp .env.example .env
fi
# Đặt mật khẩu Postgres nội bộ nếu vẫn còn giá trị mẫu (tránh pipe dễ vỡ dưới pipefail).
if grep -q "^POSTGRES_PASSWORD=doi-mat-khau-nay" .env 2>/dev/null; then
  PW="dk_$(date +%s)_${RANDOM}${RANDOM}"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PW|" .env
  echo "Đã đặt mật khẩu Postgres nội bộ (chỉ dùng trong máy này)."
else
  echo ".env đã cấu hình — giữ nguyên."
fi

msg "Bước 4/5 — Build & khởi động (lần đầu mất 5–10 phút, cứ để chạy)"
sudo docker compose -f "$COMPOSE_FILE" up -d --build

msg "Bước 5/5 — Chờ ứng dụng sẵn sàng"
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/tools/auto-subtitle; then
    echo
    echo "✅ HOÀN TẤT! Mở trình duyệt trên Windows và vào:"
    echo
    echo "    http://localhost:3000/tools/auto-subtitle"
    echo
    echo "Lần tạo phụ đề ĐẦU TIÊN sẽ tải model nhận dạng (~500MB) — chỉ một lần."
    echo "Tắt app:  cd $DIR && sudo docker compose -f $COMPOSE_FILE down"
    echo "Bật lại:  cd $DIR && sudo docker compose -f $COMPOSE_FILE up -d"
    exit 0
  fi
  sleep 5
done

echo "⚠️ App chưa phản hồi sau 5 phút. Xem log bằng lệnh:"
echo "    cd $DIR && sudo docker compose -f $COMPOSE_FILE logs --tail 50 app worker"
exit 1
