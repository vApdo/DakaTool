/**
 * Factory chọn storage driver theo env STORAGE_DRIVER (local | s3).
 * Singleton để tái dùng S3Client / cấu hình.
 */
import { LocalStorageProvider } from "./local-storage"
import { S3StorageProvider } from "./s3-storage"
import type { StorageProvider } from "./storage"

let cached: StorageProvider | undefined

/**
 * Làm sạch khoá S3 lấy từ biến môi trường.
 *
 * Dán khoá vào bảng cấu hình rất dễ lẫn khoảng trắng hoặc dấu xuống dòng. Khi đó
 * SDK nhét nguyên ký tự đó vào header Authorization và Node ném
 * `TypeError: Invalid character in header content ["authorization"]` — một câu
 * chẳng gợi ý gì tới việc "khoá bị dán thừa ký tự", lại còn hiện ra dưới lốt lỗi
 * CORS ở phía trình duyệt vì phản hồi lỗi của R2 không kèm header CORS.
 *
 * Nên cắt hai đầu trước, và nếu bên trong vẫn còn ký tự lạ thì dừng ngay với câu
 * nói thẳng phải sửa gì.
 */
function cleanCredential(raw: string | undefined, name: string): string | undefined {
  if (raw === undefined) return undefined
  const value = raw.trim()
  if (value === "") return undefined

  // Khoá S3/R2 chỉ gồm chữ và số (R2: 32 ký tự cho Access Key ID, 64 cho Secret).
  const invalid = value.match(/[^A-Za-z0-9]/)
  if (invalid) {
    const viTri = value.indexOf(invalid[0]) + 1
    const moTa = /\s/.test(invalid[0]) ? "khoảng trắng hoặc xuống dòng" : `"${invalid[0]}"`
    throw new Error(
      `${name} chứa ký tự không hợp lệ (${moTa}) ở vị trí ${viTri}/${value.length}. ` +
        "Khoá R2 chỉ gồm chữ và số. Nhiều khả năng bạn đã dán kèm nhãn hoặc dòng thừa — " +
        "copy lại đúng dãy ký tự (Access Key ID 32, Secret Access Key 64) rồi Redeploy.",
    )
  }
  return value
}

function createProvider(): StorageProvider {
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase()

  if (driver === "s3") {
    const bucket = process.env.S3_BUCKET?.trim()
    const region = process.env.S3_REGION?.trim() || "auto"
    const accessKeyId = cleanCredential(process.env.S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID")
    const secretAccessKey = cleanCredential(
      process.env.S3_SECRET_ACCESS_KEY,
      "S3_SECRET_ACCESS_KEY",
    )
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_DRIVER=s3 nhưng thiếu S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY",
      )
    }
    return new S3StorageProvider({
      bucket,
      region,
      endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    })
  }

  const root = process.env.LOCAL_STORAGE_ROOT ?? "./data"
  return new LocalStorageProvider(root)
}

export function getStorage(): StorageProvider {
  if (!cached) cached = createProvider()
  return cached
}

export type { StorageProvider } from "./storage"
export { buildStorageKey } from "./storage"
