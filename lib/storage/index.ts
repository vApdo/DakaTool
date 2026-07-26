/**
 * Factory chọn storage driver theo env STORAGE_DRIVER (local | s3).
 * Singleton để tái dùng S3Client / cấu hình.
 */
import { LocalStorageProvider } from "./local-storage"
import { S3StorageProvider } from "./s3-storage"
import type { StorageProvider } from "./storage"

let cached: StorageProvider | undefined

function createProvider(): StorageProvider {
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase()

  if (driver === "s3") {
    const bucket = process.env.S3_BUCKET
    const region = process.env.S3_REGION ?? "auto"
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_DRIVER=s3 nhưng thiếu S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY",
      )
    }
    return new S3StorageProvider({
      bucket,
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
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
