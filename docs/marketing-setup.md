# Cài đặt Marketing (đăng bài Fanpage)

Mục **Marketing** trong DakaTool cho team MKT soạn bài rồi đăng ngay
hoặc hẹn giờ lên Fanpage. Phần này cần 3 thứ do người quản trị cài một lần.

## 1. Ứng dụng Facebook (`FB_APP_ID`, `FB_APP_SECRET`)

DakaTool đăng bài bằng quyền của **một tài khoản Facebook đang quản lý các Fanpage**:
một người trong team bấm **Kết nối Facebook** một lần, đăng nhập và chọn Fanpage. Không cần Business Manager
hay System User, nhưng Facebook bắt buộc mọi web đăng bài qua API phải có một ứng dụng (Meta App).

1. Vào [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Tạo ứng dụng**.
   Chọn trường hợp dùng liên quan tới **quản lý Trang** (Manage everything on your Page), hoặc loại **Business**.
2. Trong ứng dụng, thêm sản phẩm **Facebook Login** (Facebook Login for Business nếu chỉ có lựa chọn đó).
   Ở **Settings** của Facebook Login, mục **Valid OAuth Redirect URIs**, thêm:
   `https://dakatool.vercel.app/api/marketing/facebook/callback`
   (thay bằng tên miền DakaTool thật nếu khác; chạy thử trên máy thì thêm `http://localhost:3000/api/marketing/facebook/callback`).
3. **App settings → Basic**: sao chép **App ID** và **App Secret**. App Secret giữ kín như mật khẩu,
   **không gửi qua chat hay email**, dán thẳng vào Vercel ở mục 3.
4. Để ứng dụng ở chế độ **Development** là đủ dùng nội bộ, không cần Facebook xét duyệt.
   Khi đó chỉ người có vai trò trong ứng dụng mới đăng nhập được: vào **App roles → Roles**,
   thêm tài khoản Facebook sẽ bấm kết nối làm **Administrator** hoặc **Tester** (người được mời phải bấm chấp nhận).

### Kết nối Fanpage

1. Mở **Marketing** trong DakaTool, bấm **Kết nối Facebook**.
2. Đăng nhập tài khoản đang quản trị Fanpage (cần quyền tạo nội dung trên Fanpage), tích chọn các Fanpage,
   bấm đồng ý tất cả quyền Facebook hỏi.
3. Facebook chuyển về DakaTool, khung kết nối hiện tên các Fanpage đã kết nối.

Thêm Fanpage mới: bấm **Kết nối lại** và tích thêm Fanpage đó (danh sách được thay bằng lựa chọn mới).

Kết nối **mất hiệu lực** khi tài khoản đã kết nối đổi mật khẩu, bị gỡ quyền quản lý Fanpage hoặc gỡ ứng dụng
khỏi Facebook. Khi đó lúc đăng bài DakaTool sẽ báo cần kết nối lại, chỉ việc bấm **Kết nối lại**.
Bài đã hẹn giờ vẫn tự đăng vì lịch nằm trên Facebook.

Token Fanpage được lưu trong database ở dạng mã hoá (khoá suy ra từ App Secret), không bao giờ gửi xuống trình duyệt.

## 2. Ai được đăng bài

Không có bước duyệt: ai có mã truy cập DakaTool đều soạn, đăng, hẹn giờ, huỷ lịch, xoá bài và
kết nối lại Facebook. Mỗi bài ghi tên người đăng. Chỉ đưa mã DakaTool cho người được phép đăng lên Fanpage.

## 3. Biến môi trường trên Vercel

Vercel → project `dakatool` → **Settings → Environment Variables**, bật cho **Production** và **Preview**:

| Biến | Giá trị |
|---|---|
| `FB_APP_ID` | App ID ở mục 1 |
| `FB_APP_SECRET` | App Secret ở mục 1 |
| `FB_GRAPH_VERSION` | (không bắt buộc) mặc định `v26.0` |
| `STORAGE_DRIVER` + `S3_*` | bắt buộc để tải ảnh/video: `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (Cloudflare R2 hoặc AWS S3) |

Bucket S3/R2 cần cho phép CORS `PUT` từ tên miền DakaTool, vì trình duyệt tải ảnh/video thẳng lên bucket.
Ví dụ cấu hình CORS: origin `https://dakatool.vercel.app`, method `PUT`, header `Content-Type`.

Sau khi đặt biến, **Redeploy** bản Production rồi bấm **Kết nối Facebook** (mục 1).
Đổi `FB_APP_SECRET` thì phải kết nối lại. Bảng dữ liệu mới được tạo tự động khi build
(`prisma migrate deploy` trong `scripts/vercel-build.mjs`).

## Cách hoạt động

- **Hẹn giờ** dùng tính năng hẹn giờ gốc của Facebook: bài nằm sẵn trong mục *Đã lên lịch* của Fanpage
  và tự đăng đúng giờ, kể cả khi không ai mở DakaTool. Giờ hẹn phải cách lúc bấm Lên lịch từ 10 phút đến 30 ngày.
- **Ảnh**: tối đa 10 ảnh JPG/PNG/GIF, 8 MB mỗi ảnh.
- **Video**: 1 video MP4/MOV mỗi bài, tối đa 1 GB, không kèm ảnh (Facebook không cho trộn).
  Lúc đăng, DakaTool đưa Facebook một link tải tạm (6 giờ) từ bucket để Facebook tự tải video,
  nên file nặng không phải đi qua máy chủ Vercel. Video vừa đăng cần vài phút để Facebook xử lý xong mới xem được.
- **Sửa bài đã lên lịch**: huỷ lịch (bài về nháp), sửa, rồi bấm Lên lịch lại.
- Reels và đăng link (khung xem trước link) chưa hỗ trợ.

## Thử lần đầu

Nên tạo một **Fanpage thử nghiệm**, chọn nó khi kết nối, rồi thử: đăng ngay một bài chữ,
hẹn giờ một bài 3 ảnh và một bài video sau 15 phút, huỷ lịch, xoá bài. Kiểm tra kết quả trực tiếp trên Fanpage.
