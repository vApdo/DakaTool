/**
 * Đưa một object storage về đường dẫn cục bộ cho FFmpeg/Python.
 * Local driver: dùng path trực tiếp. S3: tải về temp.
 */
import { createWriteStream } from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import type { StorageProvider } from "@/lib/storage"

export async function resolveToLocalPath(
  storage: StorageProvider,
  key: string,
  tempDir: string,
  filename: string,
): Promise<string> {
  const local = storage.getLocalPath?.(key)
  if (local) return local

  const dest = path.join(tempDir, filename)
  const stream = await storage.getObjectStream(key)
  await pipeline(stream, createWriteStream(dest))
  return dest
}
