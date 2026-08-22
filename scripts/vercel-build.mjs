/**
 * Build cho Vercel.
 *
 * Vì sao cần script này thay vì nối lệnh bằng `&&` trong package.json:
 * `prisma migrate deploy` BẮT BUỘC phải có DATABASE_URL trỏ tới một Postgres
 * đang chạy, ngay tại lúc build. Trên Vercel, biến môi trường phải được khai
 * báo thủ công trong Project Settings và phải bật cho đúng môi trường
 * (Production / Preview). Chỉ cần thiếu ở một môi trường là toàn bộ deploy
 * chết ở bước migrate với lỗi Prisma P1012 khó hiểu — kể cả những trang không
 * đụng gì tới database (trang chủ, toàn bộ tool PDF chạy trong trình duyệt).
 *
 * Nguyên tắc ở đây:
 * - Thiếu cấu hình DB  → CẢNH BÁO rồi vẫn build. App lên được, phần không cần
 *   DB dùng bình thường; Auto Subtitle sẽ không dùng được các luồng cần DB.
 * - Có DATABASE_URL nhưng migrate hỏng → DỪNG. Người dùng đã cố ý cấu hình DB
 *   nên đây là lỗi thật (sai chuỗi kết nối, DB không cho kết nối...), phải nói
 *   to chứ không nuốt đi rồi để app 500 lúc chạy.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const BOX = "=".repeat(70)

/**
 * Trên Vercel, DATABASE_URL nằm trong process.env (không có file .env).
 * Khi chạy tay ở máy thì ngược lại: biến nằm trong .env và chỉ Prisma CLI mới
 * tự đọc file đó, còn script Node này thì không. Kiểm cả hai nơi, nếu không
 * sẽ bỏ qua migration ở máy mà không ai biết.
 */
function hasDatabaseUrl() {
  if (process.env.DATABASE_URL) return true
  if (!existsSync(".env")) return false
  return /^\s*DATABASE_URL\s*=\s*\S/m.test(readFileSync(".env", "utf8"))
}

function run(command, args) {
  const res = spawnSync(command, args, { stdio: "inherit", shell: false })
  if (res.error) throw res.error
  return res.status ?? 1
}

function warn(lines) {
  console.warn(`\n${BOX}`)
  for (const line of lines) console.warn(line)
  console.warn(`${BOX}\n`)
}

// 1. Prisma Client — luôn cần, không phụ thuộc DATABASE_URL.
if (run("npx", ["prisma", "generate"]) !== 0) {
  console.error("Không sinh được Prisma Client. Dừng build.")
  process.exit(1)
}

// 2. Migrate + seed — chỉ khi có cấu hình DB.
if (hasDatabaseUrl()) {
  if (run("npx", ["prisma", "migrate", "deploy"]) !== 0) {
    console.error(`\n${BOX}`)
    console.error("DỪNG BUILD: chạy migration thất bại.")
    console.error("")
    console.error("DATABASE_URL đã được khai báo nhưng không migrate được. Kiểm tra:")
    console.error("  - Dùng chuỗi POOLED (Neon: host có đuôi '-pooler'), kèm ?sslmode=require")
    console.error("  - Database đang bật, chưa bị tạm dừng do không dùng lâu ngày")
    console.error("  - Mật khẩu trong chuỗi đã được URL-encode nếu chứa ký tự đặc biệt")
    console.error("Xem cấu hình DATABASE_URL trong .env.example và docs/deploy-vps.md.")
    console.error(`${BOX}\n`)
    process.exit(1)
  }

  // Seed idempotent — hỏng cũng không chặn deploy.
  if (run("npx", ["tsx", "prisma/seed.ts"]) !== 0) {
    warn(["Bỏ qua seed (không nghiêm trọng)."])
  }
} else {
  warn([
    "THIẾU DATABASE_URL — bỏ qua migration, vẫn tiếp tục build.",
    "",
    "Hệ quả: Auto Subtitle không dùng được các luồng cần cơ sở dữ liệu.",
    "Trang chủ và các tool PDF chạy trong trình duyệt vẫn dùng được.",
    "",
    "Cách bật: Vercel → Project Settings → Environment Variables → thêm",
    "DATABASE_URL, bật cho đúng môi trường rồi Redeploy.",
  ])
}

// 3. Build Next.js.
process.exit(run("npx", ["next", "build"]))
