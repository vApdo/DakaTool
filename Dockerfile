# Image production cho DakaTool + Auto Subtitle.
# Gộp Node (Next UI+API, worker) và Python (subtitle engine) + FFmpeg + phông DejaVu
# vào một image, vì worker cần spawn Python engine trong cùng container.
# Cùng image này chạy 2 vai trò (đặt qua command trong docker-compose): app và worker.

FROM node:20-bookworm-slim

# Python + FFmpeg + phông tiếng Việt + openssl (Prisma). --no-install-recommends cho gọn.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 python3-venv python3-pip \
        ffmpeg fonts-dejavu-core \
        openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Python engine deps trong venv riêng (Debian bookworm chặn pip vào system) ---
ENV VENV=/opt/venv
RUN python3 -m venv "$VENV"
ENV PATH="$VENV/bin:$PATH"
COPY services/subtitle-engine/requirements.txt ./services/subtitle-engine/requirements.txt
RUN "$VENV/bin/pip" install --no-cache-dir -r services/subtitle-engine/requirements.txt

# --- Node deps (gồm devDeps: tsx cho worker, prisma, typescript cho build) ---
COPY package.json package-lock.json ./
RUN npm ci

# --- Sinh Prisma client rồi build Next ---
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# Engine Python chạy bằng interpreter của venv; cache model whisper vào /models.
ENV SUBTITLE_ENGINE_PYTHON=/opt/venv/bin/python \
    SUBTITLE_ENGINE_DIR=/app/services/subtitle-engine \
    SUBTITLE_FONTS_DIR=/app/assets/fonts \
    HF_HOME=/models \
    NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Mặc định chạy app (Next). Worker override command trong docker-compose.
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["app"]
