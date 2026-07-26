import type { MetadataRoute } from "next"

/**
 * Bản deploy này để mở phần xem (không có đăng nhập), truy cập theo nguyên tắc
 * "ai có link thì xem". Chặn bot đánh chỉ mục để link chỉ lan theo đường chia sẻ
 * trực tiếp, không lọt lên kết quả tìm kiếm.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  }
}
