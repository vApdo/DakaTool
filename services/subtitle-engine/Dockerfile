# Image cho Python subtitle engine: faster-whisper + FFmpeg + phông DejaVu.
# Node worker gọi engine này qua spawn (mảng tham số). Engine KHÔNG chạm DB.
FROM python:3.11-slim

# ffmpeg/ffprobe cho tách audio & ghép sub; fonts-dejavu-core cho phụ đề tiếng Việt.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Thư mục cache model whisper (mount volume để không tải lại mỗi lần).
ENV HF_HOME=/models
VOLUME ["/models"]

# Mặc định in help; worker sẽ override bằng lệnh transcribe/build cụ thể.
ENTRYPOINT ["python", "-m", "subtitle_engine.cli"]
CMD ["--help"]
