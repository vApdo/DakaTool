import type { MetadataRoute } from "next"

/**
 * Cấu hình PWA — quản lý công trường bấm "Thêm vào màn hình chính" là mở được
 * như một app riêng (toàn màn hình, không thanh địa chỉ trình duyệt).
 * Không cần đưa lên CH Play / App Store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DakaTool — Công cụ nội bộ",
    short_name: "DakaTool",
    description: "Quản lý công trình, phụ đề tự động và các công cụ nội bộ.",
    start_url: "/construction",
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
