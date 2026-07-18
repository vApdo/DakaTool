/**
 * Local disk storage driver. Ghi file dưới LOCAL_STORAGE_ROOT.
 * Có bảo vệ path traversal: mọi key resolve xong phải nằm trong root.
 */
import { createReadStream } from "node:fs"
import { mkdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { createWriteStream } from "node:fs"
import type { Readable } from "node:stream"
import type { PutObjectInput, StorageProvider } from "./storage"

export class LocalStorageProvider implements StorageProvider {
  readonly driver = "local" as const
  private readonly root: string

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  /** Resolve key → path tuyệt đối; ném lỗi nếu thoát khỏi root. */
  private resolve(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "")
    const full = path.resolve(this.root, normalized)
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key (path traversal)")
    }
    return full
  }

  async putObject(input: PutObjectInput): Promise<{ key: string }> {
    const full = this.resolve(input.key)
    await mkdir(path.dirname(full), { recursive: true })
    if (Buffer.isBuffer(input.body)) {
      await writeFile(full, input.body)
    } else {
      await pipeline(input.body as Readable, createWriteStream(full))
    }
    return { key: input.key }
  }

  async getObjectStream(key: string): Promise<Readable> {
    const full = this.resolve(key)
    return createReadStream(full)
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key))
      return true
    } catch {
      return false
    }
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true })
  }

  getLocalPath(key: string): string {
    return this.resolve(key)
  }
}
