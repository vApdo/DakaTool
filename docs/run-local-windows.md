# Chạy Auto Subtitle trên máy Windows (local, không cần VPS)

Hướng dẫn cho máy Windows 10/11, đặc biệt bản **LTSC** (đã kiểm với Windows 10 IoT
Enterprise LTSC build 19044). Cấu hình khuyến nghị: CPU 4 nhân trở lên, RAM 8GB+
(máy 10 nhân / 32GB chạy thoải mái, kể cả model `medium`).

## Vì sao dùng WSL2 (không phải Docker Desktop / native Windows)
- Docker Desktop bản mới yêu cầu Windows build 19045 (22H2)+ — LTSC 19044 không đạt.
- Redis không có bản Windows chính thức.
- WSL2 + Docker cài **bên trong Ubuntu** chạy đầy đủ, nhẹ, không cần license Docker Desktop.

## Bước 1 — Bật WSL2 (một lần)
Mở **PowerShell (Run as Administrator)**:
```powershell
wsl --install -d Ubuntu
```
Khởi động lại máy khi được yêu cầu, mở app "Ubuntu", đặt username/password.

> Nếu lỗi ảo hoá: vào BIOS bật **Intel VT-x** (mainboard X99 đều có, mục CPU Configuration).

## Cách nhanh nhất — một lệnh duy nhất

Nếu đã xong Bước 1 (WSL2 + Ubuntu), mở cửa sổ Ubuntu và dán:
```bash
curl -fsSL https://raw.githubusercontent.com/vApdo/DakaTool/feat/auto-subtitle/scripts/setup-local.sh | bash
```
Script tự làm toàn bộ Bước 2–3 (cài Docker, tải code, tạo `.env`, build, khởi động)
và in địa chỉ truy cập khi xong. Chạy lại lệnh này bất cứ lúc nào để cập nhật + bật lại.
Các mục dưới đây chỉ cần khi muốn làm thủ công từng bước.

## Bước 2 — Cài Docker bên trong Ubuntu (một lần)
Trong cửa sổ Ubuntu:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# đóng rồi mở lại cửa sổ Ubuntu để nhóm docker có hiệu lực
```

## Bước 3 — Lấy mã và chạy
```bash
git clone <repo-url> dakatool && cd dakatool
git checkout feat/auto-subtitle
cp .env.example .env          # mở sửa: đổi POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml up -d --build
```
Lần đầu build ~5–10 phút. Sau đó mở trình duyệt **Windows** vào:

**http://localhost:3000/tools/auto-subtitle**

(WSL2 tự chuyển tiếp localhost — không cần cấu hình gì thêm.)

Lần tạo phụ đề đầu tiên, worker tải model whisper (~500MB với `small`) — chỉ một lần,
cache vào volume `models`.

## Chọn model theo máy
Sửa `WHISPER_MODEL` trong `.env` rồi `docker compose -f docker-compose.prod.yml up -d`:

| Model | RAM cần | Tốc độ (CPU 10 nhân, video 30 phút) | Độ chính xác tiếng Việt |
|---|---|---|---|
| `base` | ~1GB | ~2–4 phút | Tạm |
| `small` (mặc định) | ~2GB | ~4–8 phút | Tốt |
| `medium` | ~5GB | ~15–25 phút | Rất tốt |

Máy 32GB RAM: dùng `small` hằng ngày, chuyển `medium` khi cần bản chính xác cao.

## Vận hành hằng ngày
- Tắt: `docker compose -f docker-compose.prod.yml down` (dữ liệu giữ nguyên trong volume).
- Bật lại: `docker compose -f docker-compose.prod.yml up -d` (không cần build lại).
- Tự chạy khi mở máy: Docker trong WSL không tự khởi động; đơn giản nhất là mở Ubuntu
  và chạy lệnh bật lại ở trên khi cần dùng.
- Cập nhật phiên bản mới: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.

## Cho đồng nghiệp cùng mạng LAN dùng (tuỳ chọn)
Mặc định chỉ máy bạn truy cập được. Muốn chia sẻ trong LAN, mở PowerShell (Admin):
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=localhost
New-NetFirewallRule -DisplayName "DakaTool 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```
Đồng nghiệp vào `http://<IP-máy-bạn>:3000`. (Máy bạn phải đang bật và app đang chạy.)

## Khi nào nên chuyển lên VPS
Dùng local thấy ổn và muốn: nhiều người dùng từ xa, chạy 24/7, không phụ thuộc máy cá
nhân → làm theo `docs/deploy-vps.md`. Cấu hình Docker giống hệt nên chuyển chỉ mất vài phút.
