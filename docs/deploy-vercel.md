# Deploy module Quản lý công trình lên Vercel

Dành cho nhu cầu: **ban lãnh đạo xem tiến độ công trình từ xa**, quản lý cấp trung nhập
liệu qua điện thoại ngoài công trường — không cần VPS, không cần máy cá nhân bật 24/7.

> **Chỉ deploy được module công trình.** Auto Subtitle không chạy trên Vercel (cần worker
> nền, Redis, Python/ffmpeg, job kéo dài hàng giờ). Trang `/tools/auto-subtitle` sau khi
> deploy sẽ tạo được project nhưng job không bao giờ chạy vì không có worker tiêu thụ
> queue. Cần Auto Subtitle thì dùng `docs/deploy-vps.md`.

## Cảnh báo trước khi bắt đầu

Bản này **không có đăng nhập cho người xem**: mọi route đọc đều mở, nên **bất kỳ ai có
link đều xem được ảnh công trường, tiến độ và toàn bộ số liệu dự toán / chi phí**. Đã bật
`noindex` (xem `app/robots.ts`) nên link không lên Google, nhưng đó không phải là bảo mật
— chỉ là giảm rủi ro lộ tình cờ.

Mã quản lý chỉ chặn phần **ghi**. Nếu sau này cần phân quyền theo người hoặc truy vết ai
sửa gì, phải nâng lên hệ thống tài khoản thật.

## Bước 1 — Postgres (Neon)

1. Tạo tài khoản ở [neon.tech](https://neon.tech), tạo project, chọn region gần VN
   (Singapore).
2. Copy **Pooled connection string** — quan trọng: bản `-pooler`, không phải bản direct.
   Serverless mở rất nhiều connection ngắn, dùng chuỗi direct sẽ hết connection.

```
postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/dakatool?sslmode=require
```

Supabase hoặc Vercel Postgres cũng được, miễn là dùng chuỗi có pooler.

## Bước 2 — Kho ảnh (Cloudflare R2)

Ổ đĩa của Vercel là read-only và mất sau mỗi lần deploy, nên **bắt buộc** dùng S3/R2.
R2 miễn phí 10GB và không tính phí băng thông ra.

1. Cloudflare → R2 → Create bucket, ví dụ `dakatool-hqt`.
2. Manage R2 API Tokens → Create API token, quyền **Object Read & Write**, phạm vi đúng
   bucket đó. Lưu lại Access Key ID + Secret.
3. Ghi lại endpoint dạng `https://<account-id>.r2.cloudflarestorage.com`.

### CORS — bắt buộc, quên là upload hỏng

Ảnh được trình duyệt PUT **thẳng** lên R2, nên bucket phải cho phép origin của app.
Vào bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://<ten-app>.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Sau khi gắn domain riêng thì thêm domain đó vào `AllowedOrigins`.

## Bước 3 — Deploy trên Vercel

1. Import repo, chọn nhánh `feat/construction-hqt`.
2. Framework Next.js (tự nhận). **Không** đổi build command — repo đã có script
   `vercel-build` tự chạy `prisma generate` → `prisma migrate deploy` → seed → `next build`.
3. Environment Variables:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | chuỗi pooled ở bước 1 |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET` | `dakatool-hqt` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | token ở bước 2 |
| `S3_SECRET_ACCESS_KEY` | token ở bước 2 |

Không cần `REDIS_URL` và các biến `WHISPER_*` — module công trình không dùng.

4. Deploy. Lần đầu migration chạy trong build, log sẽ có dòng
   `Đã tạo công trình "Xưởng cơ khí HQT"`.

## Bước 4 — Đặt mã quản lý

Mở `https://<app>.vercel.app/construction/<id>/manage`. Lần đầu hiện màn hình
"Đặt mã quản lý" — **người mở đầu tiên đặt mã**, nên hãy tự vào đặt ngay sau khi deploy,
đừng gửi link cho người khác trước.

Mã lưu server-side, đúng mã thì nhận cookie HttpOnly hạn 30 ngày. Đổi mã là mọi cookie cũ
hết hiệu lực.

## Vì sao ảnh không đi qua server

Vercel giới hạn body của mỗi serverless function ở **4.5MB**. Một lần đăng 10 ảnh công
trường (đã nén còn ~1MB mỗi ảnh) vượt xa mức đó, bản vẽ PDF 25MB cũng vậy.

Nên luồng upload là: xin URL đã ký (`POST /api/construction/projects/:id/uploads`) →
trình duyệt PUT thẳng lên R2 → gửi key về cho server ghi DB.

Server không nhìn thấy bytes lúc truyền, nên trước khi ghi DB nó kiểm lại
(`lib/construction/verify-upload.ts`): key phải thuộc đúng công trình, object phải tồn
tại, không vượt hạn mức, và **ảnh phải đúng JPEG/PNG/WebP theo magic bytes**. Sai bất kỳ
điều kiện nào thì object bị xoá và request bị từ chối.

Khi `STORAGE_DRIVER=local` (chạy dev hoặc VPS) thì không có presigned URL — route
`/uploads` trả `direct: false` và client tự quay lại luồng multipart cũ. Nhờ vậy bản VPS
chạy y như trước, không phải cấu hình gì thêm.

## Deploy báo lỗi thì đọc log trước

Build chạy qua `scripts/vercel-build.mjs`. Script này in cảnh báo/lỗi bằng tiếng Việt
trong log deploy, nói thẳng thiếu gì và sửa ở đâu:

| Thấy trong log | Nghĩa là | Xử lý |
|---|---|---|
| `THIẾU DATABASE_URL — bỏ qua migration` | Chưa khai báo `DATABASE_URL`. Deploy **vẫn thành công**, nhưng `/construction` sẽ lỗi khi mở. | Thêm biến ở Bước 3, **tick đủ cả Production lẫn Preview**, rồi Redeploy. |
| `DỪNG BUILD: chạy migration thất bại` | Có `DATABASE_URL` nhưng không kết nối được. | Kiểm chuỗi pooled + `?sslmode=require`, DB chưa bị Neon tạm dừng, mật khẩu đã URL-encode. |
| `STORAGE_DRIVER ... trên Vercel phải là "s3"` | Đang để `local` → upload ảnh sẽ hỏng. | Làm Bước 2 rồi đặt `STORAGE_DRIVER=s3`. |

Cần nhớ: trên Vercel biến môi trường phải **tick riêng cho từng môi trường**. Chỉ tick
Production thì mọi deploy Preview (mỗi pull request đều tạo một cái) sẽ thiếu biến.

## Hạn chế đã biết

- **Gói Hobby giới hạn function 60s.** Đủ dùng vì ảnh không còn đi qua server, nhưng
  `maxDuration` trong code đã hạ xuống 60 cho hợp. (Cấu hình này chỉ có tác dụng trên
  Vercel, bản self-host bỏ qua.)
- **Ảnh mồ côi khi upload lỗi giữa chừng.** Nếu trình duyệt PUT được vài ảnh rồi mất mạng,
  số ảnh đã lên R2 sẽ không được tham chiếu và cũng không bị xoá. Không ảnh hưởng dữ liệu,
  chỉ tốn dung lượng. Nếu tích tụ nhiều, đặt lifecycle rule trên R2 xoá object không gắn
  tag sau N ngày.
- **Rate limit chống dò mã đếm theo IP trong DB** (bảng `ConstructionAuthAttempt`),
  8 lần / 10 phút. Dùng được trên serverless nhiều instance, khác bản cũ đếm trong RAM.

## Chi phí thực tế

Neon free tier + R2 free tier (10GB) + Vercel Hobby = **0đ** cho quy mô vài công trình,
vài trăm ảnh. Vercel Hobby về nguyên tắc dành cho dự án phi thương mại — dùng cho công ty
thì nên lên Pro ($20/tháng).
