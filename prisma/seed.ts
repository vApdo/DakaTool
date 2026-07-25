/**
 * Prisma seed (idempotent).
 *
 * - Thư viện Tool của DakaTool là tĩnh (lib/data.ts) nên không seed vào DB.
 * - Auto Subtitle: dữ liệu do người dùng tạo khi chạy, không cần seed.
 * - Quản lý công trình: tạo sẵn dự án "Xưởng cơ khí HQT" kèm khung hạng mục mẫu
 *   để ban lãnh đạo thấy cấu trúc ngay từ đầu (chỉ tạo nếu chưa tồn tại).
 */
import { prisma } from "@/lib/prisma"

const HQT_NAME = "Xưởng cơ khí HQT"

const DEFAULT_MILESTONES = [
  "San lấp & chuẩn bị mặt bằng",
  "Thi công móng",
  "Lắp dựng khung thép",
  "Lợp mái & bao che",
  "Nền xưởng & hạ tầng kỹ thuật",
  "Điện - nước - PCCC",
  "Hoàn thiện & nghiệm thu",
]

async function seedConstruction() {
  const existing = await prisma.constructionProject.findFirst({ where: { name: HQT_NAME } })
  if (existing) {
    console.log(`[seed] Công trình "${HQT_NAME}" đã có (id=${existing.id}) — bỏ qua.`)
    return
  }

  const project = await prisma.constructionProject.create({
    data: {
      name: HQT_NAME,
      description: "Dự án xây dựng nhà xưởng cơ khí HQT.",
      status: "IN_PROGRESS",
      milestones: {
        create: DEFAULT_MILESTONES.map((name, i) => ({
          name,
          status: "NOT_STARTED" as const,
          percent: 0,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`[seed] Đã tạo công trình "${HQT_NAME}" (id=${project.id}) với ${DEFAULT_MILESTONES.length} hạng mục.`)
}

async function main() {
  const projectCount = await prisma.subtitleProject.count()
  console.log(`[seed] Auto Subtitle: ${projectCount} project (không cần seed).`)
  await seedConstruction()
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
