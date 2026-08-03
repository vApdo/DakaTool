/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    // Mặc định `next lint` chỉ quét app/pages/components/lib/src — bỏ sót worker,
    // test và script, tức đúng những chỗ dễ lọt lỗi nhất. Liệt kê tường minh.
    // (sellertool/ có toolchain riêng nên loại ở .eslintrc.json.)
    dirs: ["app", "lib", "components", "test", "scripts"],
  },
}

export default nextConfig
