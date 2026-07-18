# Auto Subtitle — Kiến trúc

Công cụ **Tự động ghép phụ đề** (Auto Subtitle) là luồng end-to-end: tải video →
nhận dạng giọng nói → chỉnh sửa phụ đề → xuất SRT/VTT/ASS hoặc ghép cứng vào MP4.

Khác với các công cụ PDF (chạy hoàn toàn client-side), Auto Subtitle cần backend
động: DB, hàng đợi job, worker và một engine Python nặng. Các công cụ PDF hiện có
KHÔNG bị ảnh hưởng và vẫn chạy trong trình duyệt.

## Sơ đồ luồng

```
Trình duyệt (Next.js UI)
      │  upload video (multipart)
      ▼
Route Handlers  ──►  PostgreSQL (Prisma)   ◄─ trạng thái, segment, job, export
  /api/tools/auto-subtitle/*        │
      │  enqueue                    │ (không truy cập DB)
      ▼                             │
Redis + BullMQ  ──►  Node Worker ───┼──► spawn (mảng args, KHÔNG shell)
 queue                              │        ▼
                                    │   Python Subtitle Engine
                                    │   - faster-whisper (ASR)
                                    │   - FFmpeg/ffprobe (audio, burn)
                                    │   - formatter (luật tách dòng)
                                    │   - SRT/VTT/ASS writer
                                    │        │ JSON Lines (stdout) = tiến độ
                                    │        │ file kết quả (result.json, subtitles.*)
                                    ▼        ▼
                             Storage Adapter (local | S3/R2/MinIO)
```

## Ranh giới trách nhiệm

### Python engine (`services/subtitle-engine`)
- **KHÔNG** truy cập database.
- Nhận: đường dẫn video vào, thư mục ra, tuỳ chọn model/ngôn ngữ.
- Làm: probe → tách audio → transcribe → áp luật tách phụ đề → ghi
  `result.json` + `subtitles.srt/vtt/ass`.
- Giao tiếp: **JSON Lines trên stdout** (`{"type":"progress"...}`,
  `{"type":"completed"...}`, `{"type":"error"...}`); log chẩn đoán ra **stderr**.
- CLI:
  - `python -m subtitle_engine.cli transcribe --input --output-dir --language --model --device --compute-type --beam-size [--no-vad]`
  - `python -m subtitle_engine.cli build --segments --output-dir [--style]` — sinh lại
    phụ đề từ segment đã chỉnh sửa (dùng cho export & render).

### Node worker (`workers/`)
- Kéo job từ BullMQ (`dakatool-auto-subtitle`), concurrency 1.
- Giải quyết video nguồn từ storage → path cục bộ (S3 thì tải về temp).
- Tạo thư mục tạm, gọi Python bằng `spawn(pythonBin, [args...], { shell: false })`.
  **Tuyệt đối không** `exec(\`python ${input}\`)` hay `shell: true`.
- Đọc tiến độ JSON Lines → cập nhật DB (project.status/progress, job).
- Lưu segment, upload file phụ đề/MP4 vào storage, cập nhật trạng thái, dọn temp.
- Job: `transcribe-video`, `render-video`, `generate-subtitle-export`.
  attempts=2, backoff exponential delay=5000.

### API (`app/api/tools/auto-subtitle/`)
| Method | Đường dẫn | Vai trò |
|--------|-----------|---------|
| POST | `/projects` | Upload video (multipart) + ffprobe verify + tạo project |
| GET | `/projects/:id` | Chi tiết project (UI poll mỗi 2s khi đang xử lý) |
| POST | `/projects/:id/start` | Tạo job transcribe (chống trùng) + enqueue |
| GET | `/projects/:id/source` | Stream video nguồn để preview (hỗ trợ Range) |
| PATCH | `/projects/:id/segments` | Cập nhật nhiều segment (transaction) |
| PATCH | `/projects/:id/segments/:sid` | Cập nhật một segment |
| PATCH | `/projects/:id/style` | Cập nhật kiểu phụ đề |
| POST | `/projects/:id/exports` | Tạo export SRT/VTT/ASS/BURNED_MP4 + enqueue |
| GET | `/exports/:id/download` | Tải file export (S3: redirect presigned) |

### Storage (`lib/storage/`)
Interface `StorageProvider`: `putObject`, `getObjectStream`, `objectExists`,
`deleteObject`, `getLocalPath?`, `createUploadUrl?` (S3 presigned), `createDownloadUrl?`.
Driver: `local` (đĩa, có chống path traversal) và `s3` (AWS/R2/MinIO). Key luôn do
server sinh (`buildStorageKey`) — không nhận key thô từ client.

## Bảo mật
- Gọi tiến trình con bằng mảng tham số, không shell → chống command injection.
- Không tin MIME/đuôi client: xác minh bằng ffprobe (có luồng video, thời lượng).
- Giới hạn kích thước (≤1GB) & thời lượng (≤2h), cấu hình qua env.
- Escape ASS: không cho chèn tag/override của người dùng vào phụ đề.
- Danh tính chủ sở hữu tạm bằng cookie ẩn danh (`daka_owner`) cho tới khi có auth thật.

## Luật tách phụ đề (`formatter.py`)
`MAX_CHARS_PER_LINE=42`, `MAX_LINES_PER_CUE=2`, `MAX_CUE_DURATION_MS=5500`,
`MIN_CUE_DURATION_MS=800`, `SPLIT_PAUSE_MS=600`, `CUE_GAP_MS=50`. Cắt tại ranh giới
từ; ưu tiên `.!?…` rồi `,;:`; không mất chữ; giữ Unicode tiếng Việt; xử lý thiếu
timestamp bằng cách phân bổ theo độ dài từ.

## Điểm mở rộng
- `WordAligner` (Protocol trong `transcriber.py`): cắm WhisperX để căn timestamp mức từ.
- Storage: thêm driver mới bằng cách implement `StorageProvider`.

## Chạy cục bộ
```bash
docker compose up -d                 # postgres + redis
cp .env.example .env                 # điền giá trị
npm run db:migrate                   # áp migration Prisma
pip install -r services/subtitle-engine/requirements.txt
npm run dev                          # Next.js (UI + API)
npm run worker:subtitle              # worker (tiến trình riêng)
```

> Lưu ý: lần chạy đầu, faster-whisper tải model từ HuggingFace về cache
> (`HF_HOME`). Môi trường có tường lửa cần cho phép `huggingface.co` hoặc mount sẵn
> thư mục model.
