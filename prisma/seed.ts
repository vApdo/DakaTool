/**
 * Prisma seed (idempotent).
 *
 * - Thư viện Tool của DakaTool là tĩnh (lib/data.ts) nên không seed vào DB.
 * - Auto Subtitle: dữ liệu do người dùng tạo khi chạy, không cần seed.
 * Hiện không có dữ liệu mẫu bắt buộc; lệnh được giữ để quy trình deploy ổn định.
 */
import { prisma } from "@/lib/prisma"

async function main() {
  const projectCount = await prisma.subtitleProject.count()
  console.log(`[seed] Auto Subtitle: ${projectCount} project (không cần seed).`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
