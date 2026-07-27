/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    // Auto Subtitle cần worker + Redis nên không chạy được trên Vercel (nơi
    // luôn có sẵn VERCEL=1). Cờ này được inline lúc build cho cả server lẫn
    // client — lib/data.ts dựa vào nó để ẩn tool khỏi mọi danh sách/số đếm.
    NEXT_PUBLIC_HIDE_AUTO_SUBTITLE: process.env.VERCEL ? "1" : "",
  },
}

export default nextConfig
