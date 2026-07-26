/**
 * Tạo & dọn thư mục tạm cho mỗi job. Worker luôn xử lý trong thư mục riêng rồi xoá.
 */
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

export interface TempDir {
  path: string
  cleanup(): Promise<void>
}

export async function createTempDir(prefix = "dakatool-sub-"): Promise<TempDir> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix))
  return {
    path: dir,
    async cleanup() {
      await rm(dir, { recursive: true, force: true })
    },
  }
}
