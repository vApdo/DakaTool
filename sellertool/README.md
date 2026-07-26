# Tính Lãi Thật

Máy tính lợi nhuận cho người bán hàng trên sàn TMĐT Việt Nam (Shopee, TikTok Shop) — chạy hoàn toàn trong trình duyệt, không backend, không thu thập dữ liệu.

Tool trả lời đúng 2 câu hỏi:

1. **Bóc tách phí** — "Bán giá này, trừ hết phí sàn + thuế, tôi còn lại bao nhiêu?"
2. **Tính ngược giá bán** — "Muốn lãi X%, tôi phải bán giá tối thiểu bao nhiêu?"

Kết quả trình bày như **biên lai in nhiệt**: từng dòng phí bằng tiền cụ thể, dòng "SÀN GIỮ LẠI" cộng gộp, chốt "TIỀN VỀ TAY" và dấu LÃI/HÒA/LỖ. Có nút **Chụp / Lưu phiếu** xuất PNG để chia sẻ.

## Chạy local

Yêu cầu Node.js 20+.

```bash
cd sellertool
npm install        # cài phụ thuộc (lần đầu)
npm run dev        # chạy dev tại http://localhost:5173
npm run test       # unit test công thức tính (vitest)
npm run typecheck  # kiểm tra kiểu TypeScript
npm run build      # build production ra dist/
```

## Deploy lên Vercel (từng bước)

App này nằm trong **thư mục con `sellertool/`** của repo, deploy thành một Vercel project **riêng**, không đụng gì tới project DakaTool:

1. Vào [vercel.com/new](https://vercel.com/new) → Import repo này.
2. Ở bước cấu hình, đặt **Root Directory = `sellertool`** (bấm Edit cạnh Root Directory).
3. Framework Preset: Vercel tự nhận **Vite**. Build command `npm run build`, output `dist` — giữ mặc định.
4. Deploy. Xong — mỗi lần push nhánh, Vercel tự tạo Preview; merge vào nhánh production là ra bản chính thức.
5. Khi mua domain: Project → Settings → Domains → thêm domain.

## ⚠️ CẬP NHẬT BIỂU PHÍ TRONG 5 PHÚT

**Toàn bộ biểu phí nằm trong một file duy nhất: [`src/data/fees.json`](src/data/fees.json).** Code không hardcode con số phí nào — sàn đổi phí thì chỉ sửa file này rồi deploy lại.

Mỗi khoản phí có dạng:

```json
{
  "id": "giao_dich",
  "label": "Phí xử lý giao dịch",
  "type": "percent",           // "percent" | "flat" | "percent_by_category"
  "rate": 0.06,                // phân số: 6% ghi là 0.06 (null = bắt người dùng tự nhập)
  "amount": null,              // số tiền VND, chỉ dùng cho type "flat"
  "cap": null,                 // trần tiền VND cho phí %, null = không trần
  "optional": false,           // true = gói dịch vụ bật/tắt được
  "effectiveFrom": "2026-05-01",
  "verified": false,           // false = phiếu in kèm ghi chú "chưa xác minh*"
  "sourceUrl": null            // dán link thông báo chính thức khi đã đối chiếu
}
```

Các bước khi sàn đổi phí:

1. Sửa `rate` / `amount` / `cap` tương ứng trong `src/data/fees.json` (nhớ: 6% = `0.06`).
2. Đổi `lastUpdated` ở đầu file thành ngày hôm nay (`"YYYY-MM-DD"`).
3. Nếu đã đối chiếu nguồn chính thức: đổi `verified` thành `true` và dán `sourceUrl`.
4. Commit + push → Vercel tự deploy. Sửa sai cấu trúc file thì `npm run test` và CI sẽ đỏ ngay với thông báo chỉ đúng chỗ lỗi.

Thêm sàn mới (ví dụ Shopee Mall): thêm một object vào mảng `platforms` theo đúng cấu trúc trên — không cần sửa code.

### Những con số BẠN phải tự điền (quan trọng nhất trước khi đưa cho người khác dùng)

Seed hiện tại lấy từ các bài phân tích tháng 5–6/2026, các nguồn **đang lệch nhau**, toàn bộ để `verified: false`. Cần đối chiếu trực tiếp **Shopee Seller Education Hub** (banhang.shopee.vn) và **TikTok Shop Seller Center** rồi điền:

- `phi_co_dinh.rateByCategory` (Shopee): % phí cố định từng ngành — hiện để `null`, UI đang bắt người dùng tự nhập.
- `hoa_hong.rateByCategory`, `giao_dich.rate`, `van_chuyen.rate` (TikTok Shop) — hiện để `null`.
- Kiểm tra lại: phí giao dịch Shopee 6%, Freeship Xtra 5%/trần 40.000đ, Voucher Xtra 4%/trần 50.000đ (có nguồn ghi 5,5%), phí hạ tầng 3.000đ, thuế 1,5%.
- Nếu có shop thật: đối chiếu 3–5 đơn trong sao kê tài chính của sàn với phiếu của tool — khớp trong ±1.000đ mới đạt.

## Công thức tính

Ký hiệu: `P` giá bán, `C` giá vốn, `G` đóng gói/đơn, `h` % đơn hoàn, `H` chi phí mất mỗi đơn hoàn, `t` thuế (0,015 nếu bật), `m` % lãi mục tiêu.

- Từng phí %: `phí_i = min(P × rate_i, cap_i)` (nếu có trần). Dự phòng hoàn: `R = h × H`.
- **Tiền về tay** `= P − Σphí_% − Σphí_flat − P×t − C − G − R`; % lãi ròng = tiền về tay ÷ P.
- **Tính ngược** (có trần nên giải lặp): vòng 1 bỏ trần `P = (C+G+R+Σflat) / (1 − Σrate − t − m)`; phí nào `P×rate > cap` thì cố định bằng trần, chuyển sang tử số, loại khỏi mẫu số, giải lại (tối đa 3 vòng). Kết quả làm tròn **LÊN** bội 500đ.
- Mẫu số ≤ 0 → mức lãi bất khả thi, tool báo rõ tổng phí + thuế đang chiếm bao nhiêu % giá bán.

Toàn bộ nằm trong [`src/lib/calc.ts`](src/lib/calc.ts), có 21 unit test với số kỳ vọng tính tay ([`src/lib/calc.test.ts`](src/lib/calc.test.ts)).

> Ghi chú: ca kiểm thử "lãi mục tiêu 60% phải báo bất khả thi" trong spec gốc không khớp số học với chính công thức của spec — với biểu phí seed, 60% vẫn cho giá hợp lệ (~646.000đ); bất khả thi chỉ xảy ra từ ~79,5% trở lên (đủ gói). Test dùng m = 85% cho nhánh bất khả thi và giữ ca 60% làm ca "giá cao nhưng khả thi".

## Lý do chọn thiết kế

**Palette "quầy thu ngân chợ Việt"** — 5 màu, mỗi màu một vai trò, gắn với thế giới tiền bạc/biên lai thay vì theo công thức thẩm mỹ có sẵn:

| Token | Hex | Vai trò | Gốc gác |
|---|---|---|---|
| `--nen-quay` | `#12403A` | nền app | xanh rêu mặt sau tờ 100.000đ, bàn quầy thu ngân |
| `--giay-nhiet` | `#F7F4ED` | mặt biên lai | trắng ngà cuộn giấy in bill (cố ý không ngả kem) |
| `--muc-nhiet` | `#221E1A` | chữ trên giấy | đen mềm của mực in nhiệt |
| `--do-moc` | `#BE3A34` | LỖ, cảnh báo | đỏ dấu mộc hóa đơn, đỏ lì xì — chỉ dành cho tín hiệu xấu |
| `--vang-nghe` | `#E9A13B` | hành động chính | vàng nghệ/tiệm vàng — "vàng = tiền" |

Không dùng màu nhận diện hay logo của Shopee/TikTok để tránh bị hiểu nhầm là tool chính thức. Trạng thái LÃI dùng xanh `#1B7A4E` cùng họ với nền.

**Font** (self-host qua @fontsource — vẫn là font Google Fonts nhưng không phụ thuộc CDN lúc chạy, và xuất PNG nhúng font ổn định hơn):

- Display: **Paytone One** — tròn đậm kiểu biển hiệu chợ, có subset tiếng Việt đầy đủ dấu.
- Body: **Be Vietnam Pro** — thiết kế cho tiếng Việt từ gốc.
- Số tiền: **Space Mono** — chất máy thu ngân, monospace nên mọi con số thẳng cột.

**Chữ ký thị giác:** khu kết quả là dải biên lai in nhiệt — mép răng cưa (mask conic-gradient), gạch đứt phân đoạn, vân giấy ngang, "TIỀN VỀ TAY" là chữ lớn nhất trang, trạng thái đóng dấu mộc xoay nhẹ. Seller nhìn biên lai mỗi ngày — định dạng này khiến họ tin con số.

## Phạm vi

- **Trong MVP:** 2 chế độ trên, 2 sàn (Shopee shop thường, TikTok Shop), xuất phiếu PNG.
- **Ngoài MVP** (phase 2): nhập CSV hàng loạt, xuất Excel, so sánh 2 sàn, lưu danh mục sản phẩm, Lazada, Shopee Mall.

> Công cụ ước tính tham khảo, không phải tư vấn thuế/tài chính. Biểu phí có thể thay đổi theo thông báo chính thức của sàn.
