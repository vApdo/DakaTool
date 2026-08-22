import type { MetadataRoute } from "next"

/** Cấu hình PWA để DakaTool có thể mở như một ứng dụng độc lập. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DakaTool — Công cụ nội bộ",
    short_name: "DakaTool",
    description: "Phụ đề tự động, xử lý PDF và các công cụ nội bộ.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f1211",
    theme_color: "#0b6b50",
    orientation: "portrait",
    lang: "vi",
    icons: [
      { src: "/logo-dk.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  }
}
