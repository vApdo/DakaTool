/**
 * Prisma seed. Thư viện Tool của DakaTool là tĩnh (lib/data.ts) nên không seed vào DB —
 * công cụ "Tự động ghép phụ đề" đã được thêm idempotent ở lib/data.ts.
 *
 * Các bảng Auto Subtitle (project/segment/job/export) là dữ liệu người dùng sinh ra khi
 * chạy, không cần seed. File này giữ cho script `db:seed` chạy được và là chỗ mở rộng
 * nếu sau này cần dữ liệu mẫu.
 */
import { prisma } from "@/lib/prisma"

async function main() {
  const projectCount = await prisma.subtitleProject.count()
  console.log(`[seed] Không có gì cần seed. Số project hiện tại: ${projectCount}.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
