# DakaTool

Nền tảng nội bộ để tạo, quản lý và chạy các tool xử lý công việc — hiện tập trung vào **xử lý PDF/chứng từ ngay trong trình duyệt**.

## Yêu cầu & lệnh

Khuyến nghị **Node.js 20 LTS** (CI dùng Node 20).

```bash
npm install         # cài phụ thuộc
npm run dev         # chạy dev tại http://localhost:3000
npm test            # unit test (vitest)
npx tsc --noEmit    # kiểm tra kiểu TypeScript
npm run build       # build production
```

> `npm run lint` **chưa** được đưa vào CI: dự án chưa cấu hình ESLint, chạy `next lint`
> sẽ hỏi cấu hình tương tác. Khi cần bật lint, thêm `eslint` + `eslint-config-next`
> rồi cập nhật `.github/workflows/ci.yml` trong một thay đổi riêng.

## Nguyên tắc xử lý dữ liệu

- **Toàn bộ file PDF/ảnh xử lý client-side** — không tự động upload lên server, không lưu file.
- Không có backend, database hay authentication ở giai đoạn hiện tại (dữ liệu tool là mẫu tĩnh
  trong `lib/data.ts`; lịch sử chạy lưu ở `localStorage` của trình duyệt).
- Không commit chứng từ thật của khách hàng vào repo (`test/fixtures/*.pdf` bị `.gitignore`).

### Giới hạn tài nguyên (client-side)

Đặt tập trung ở `lib/pdf/limits.ts`, dùng chung cho các tool PDF:

- Tối đa **20 file** mỗi lần; **20MB/file**.
- Tổng dung lượng tối đa **100MB** (máy tính) / **40MB** (điện thoại hoặc thiết bị ≤4GB RAM).
- OCR chỉ xử lý tối đa **20 trang** đầu để tránh quá tải bộ nhớ.
- Kiểm tra định dạng theo **cả MIME lẫn phần mở rộng** file.

### OCR trên điện thoại

OCR (Tesseract.js) chạy trong trình duyệt, rất tốn RAM/CPU. Trên điện thoại nên dùng bản scan
ít trang, ảnh rõ nét. Luồng OCR xử lý **tuần tự từng trang** và giải phóng ảnh ngay sau mỗi
trang để hạn chế hết RAM; có nút **Hủy OCR** giữa chừng.

## Tool

### Chạy thật (client-side)

| Tool | Chức năng |
|---|---|
| Trích xuất dữ liệu HBL từ PDF | Đọc text layer bằng pdfjs, trích 23 trường; PDF scan thì OCR bằng Tesseract.js. |
| Ghép PDF | Gộp nhiều PDF theo thứ tự kéo-thả. |
| Tách trang PDF | Tách theo khoảng trang hoặc từng trang (nhiều file → gói ZIP). |
| Sắp xếp trang PDF | Xoay / xóa / đổi thứ tự trang qua ảnh thu nhỏ. |
| Ảnh sang PDF | Ghép ảnh JPG/PNG thành PDF, chọn khổ A4/theo ảnh. |
| PDF sang ảnh | Xuất từng trang ra PNG/JPG. |
| Đóng dấu / Watermark PDF | Chèn chữ mờ (hỗ trợ tiếng Việt qua canvas). |
| Đánh số trang PDF | Nhiều vị trí và kiểu hiển thị. |
| Ký tên lên PDF | Vẽ chữ ký hoặc dùng ảnh chữ ký, chọn trang/vị trí. |

### Đang triển khai (bản mô phỏng)

Các tool sau hiển thị nhãn **"Đang triển khai"**, dùng `ToolRunner` mô phỏng tiến trình,
**chưa thực thi thật** và không ghi vào lịch sử: Đổi tên file hàng loạt, Gộp CSV thành Excel,
Gửi email báo cáo, Theo dõi giá sản phẩm, Nén ảnh hàng loạt, Đồng bộ Google Sheet, Tổng hợp báo cáo tuần.

## Kiến trúc

- **Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS**, deploy trên Vercel.
- Logic PDF tách khỏi UI ở `lib/pdf/` (`extract-text`, `page-text`, `classify-pdf`, `extract-hbl`,
  `normalize-fields`, `edit`, `limits`, `page-ranges`, `ocr-provider`, `ocr-tesseract`, `types`).
- Mỗi tool có runner riêng qua registry `components/tool-runner-registry.tsx`; tool chưa có
  runner thật dùng `ToolRunner` mô phỏng. Runner PDF chung ở `components/pdf/`, bộ trích xuất
  HBL ở `components/hbl/`.
- Asset OCR tự host ở `public/ocr/`, bộ giải mã ảnh pdf.js ở `public/pdfjs/` — không dùng CDN ngoài.
- Khu vực app dùng route group `app/(app)/` với sidebar chung; homepage nằm ngoài.

## Test & CI

- Unit test ở `test/` (logic PDF trong `test/pdf/`). Fixture PDF được **dựng trong test bằng pdf-lib**
  (`test/pdf/fixtures.ts`, dữ liệu giả lập, không phải chứng từ thật) nên `npm test` chạy được ngay
  trên repo clone sạch.
- GitHub Actions (`.github/workflows/ci.yml`) chạy khi push nhánh phụ hoặc PR vào `main`:
  `npm ci` → `tsc --noEmit` → `npm test` → `npm run build`.

## Quy trình đưa code lên

1. Làm việc trên **nhánh phụ** (không push trực tiếp vào `main`).
2. Mở Pull Request → Vercel tạo **Preview** để kiểm tra.
3. Chỉ **merge vào `main` khi được người dùng duyệt rõ ràng**.

## Định hướng

1. **Giai đoạn 1 (hiện tại):** dùng cá nhân, dữ liệu mẫu.
2. **Giai đoạn 2:** mở cho nhân viên nội bộ (cần backend + auth nội bộ).
3. **Giai đoạn 3:** cân nhắc thương mại hóa.

Không làm ở giai đoạn này: SaaS công khai, thanh toán, marketplace.
