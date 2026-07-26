# Fonts cho Auto Subtitle

FFmpeg dùng thư mục này (`SUBTITLE_FONTS_DIR`, mặc định `./assets/fonts`) qua tham số
`ass=...:fontsdir=...` khi ghép cứng phụ đề (burn) để đảm bảo phông chữ ổn định, không
phụ thuộc font hệ thống.

## Phông mặc định

- **DejaVu Sans** (`DejaVuSans.ttf`, `DejaVuSans-Bold.ttf`) — hỗ trợ đầy đủ dấu tiếng Việt.
  Đây là `fontName` mặc định trong `DEFAULT_SUBTITLE_STYLE`.

## Thêm phông khác

Sao chép file `.ttf`/`.otf` vào đây và đặt `subtitleStyle.fontName` khớp với tên phông
bên trong file (family name), không phải tên file.

Trong Docker, image Python cài `fonts-dejavu-core`; khi chạy cục bộ, giữ các file trong
thư mục này để kết quả nhất quán giữa các môi trường.
