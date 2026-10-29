import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DakaTool — Công cụ nội bộ",
    short_name: "DakaTool",
    description: "Công cụ lập giấy đề nghị thanh toán cho ASIA GROUP.",
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
