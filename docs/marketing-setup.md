# Cài đặt Marketing (đăng bài Fanpage)

Mục **Marketing** trong DakaTool cho team MKT soạn bài, trưởng nhóm duyệt, rồi đăng ngay
hoặc hẹn giờ lên Fanpage. Phần này cần 3 thứ do người quản trị cài một lần.

## 1. Token Facebook (`FB_SYSTEM_USER_TOKEN`)

DakaTool đăng bài thay mặt một **System User** trong Business Manager (Meta Business Suite),
không dùng tài khoản Facebook cá nhân của ai cả. Token loại này không hết hạn theo thời gian.

1. Vào [developers.facebook.com](https://developers.facebook.com/apps) → **Tạo ứng dụng** → loại **Business**,
   gắn vào đúng Business portfolio đang sở hữu các Fanpage.
2. Vào **Business settings** → **Users → System users** → **Add**, đặt tên ví dụ `DakaTool`, vai trò **Admin**.
3. Với System User vừa tạo, bấm **Assign assets**:
   - **Pages**: chọn các Fanpage cần đăng, bật quyền tạo nội dung và xem số liệu (Content + Insights).
   - **Apps**: chọn ứng dụng ở bước 1, quyền **Manage app**.
4. Bấm **Generate new token** → chọn ứng dụng ở bước 1 → thời hạn **Never** → chọn các quyền:
   `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `read_insights`.
5. Sao chép token, **không gửi qua chat hay email**. Dán thẳng vào Vercel ở bước 3 bên dưới.

Fanpage nào được gán cho System User thì hiện trong ô chọn Fanpage của DakaTool.
Thêm Fanpage mới chỉ cần gán thêm ở bước 3, không phải tạo token mới.

Nếu khi đăng Facebook báo thiếu quyền dù đã chọn đủ ở bước 4, kiểm tra trong ứng dụng
(mục **App Review → Permissions and features**) xem các quyền trên đã ở mức dùng được chưa.

## 2. Mã duyệt (`MKT_APPROVER_CODE`)

Ai có mã truy cập DakaTool đều soạn bài và gửi duyệt được. Chỉ người có **mã duyệt** mới:
duyệt & đăng/lên lịch, từ chối, huỷ lịch, xoá bài đã lên Facebook.
Đặt một mã dài (từ 12 ký tự), chỉ đưa cho trưởng nhóm. Đổi mã thì mọi phiên duyệt cũ tự hết hiệu lực.

## 3. Biến môi trường trên Vercel

Vercel → project `dakatool` → **Settings → Environment Variables**, bật cho **Production** và **Preview**:

| Biến | Giá trị |
|---|---|
| `FB_SYSTEM_USER_TOKEN` | token ở mục 1 |
| `MKT_APPROVER_CODE` | mã duyệt ở mục 2 |
| `FB_GRAPH_VERSION` | (không bắt buộc) mặc định `v26.0` |
| `STORAGE_DRIVER` + `S3_*` | bắt buộc để tải ảnh: `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (Cloudflare R2 hoặc AWS S3) |

Bucket S3/R2 cần cho phép CORS `PUT` từ tên miền DakaTool, vì trình duyệt tải ảnh thẳng lên bucket.
Ví dụ cấu hình CORS: origin `https://dakatool.vercel.app`, method `PUT`, header `Content-Type`.

Sau khi đặt biến, **Redeploy** bản Production. Bảng dữ liệu mới được tạo tự động khi build
(`prisma migrate deploy` trong `scripts/vercel-build.mjs`).

## Cách hoạt động

- **Hẹn giờ** dùng tính năng hẹn giờ gốc của Facebook: bài nằm sẵn trong mục *Đã lên lịch* của Fanpage
  và tự đăng đúng giờ, kể cả khi không ai mở DakaTool. Giờ hẹn phải cách lúc duyệt từ 10 phút đến 30 ngày.
- **Ảnh**: tối đa 10 ảnh JPG/PNG/GIF, 8 MB mỗi ảnh. Bài có ảnh thì Facebook không hiện khung xem trước link.
- **Sửa bài đã lên lịch**: huỷ lịch (bài về nháp), sửa, rồi gửi duyệt lại.
- Video/Reels chưa hỗ trợ.

## Thử lần đầu

Nên tạo một **Fanpage thử nghiệm**, gán cho System User, rồi thử: đăng ngay một bài chữ,
hẹn giờ một bài 3 ảnh sau 15 phút, huỷ lịch, xoá bài. Kiểm tra kết quả trực tiếp trên Fanpage.
