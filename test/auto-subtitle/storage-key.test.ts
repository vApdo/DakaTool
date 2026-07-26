import { describe, expect, it } from "vitest"
import { buildStorageKey } from "@/lib/storage/storage"

describe("buildStorageKey", () => {
  it("sinh key có tiền tố project + kind", () => {
    const key = buildStorageKey({ projectId: "abc123", kind: "source", filename: "video.mp4" })
    expect(key).toMatch(/^projects\/abc123\/source\//)
    expect(key.endsWith(".mp4")).toBe(true)
  })

  it("không nhúng đường dẫn client (chống path traversal)", () => {
    const key = buildStorageKey({
      projectId: "../../etc",
      kind: "source",
      filename: "../../../evil.sh",
    })
    expect(key).not.toContain("..")
    // ext an toàn: .sh hợp lệ về mặt regex nhưng basename được random hoá
    expect(key.startsWith("projects/")).toBe(true)
  })

  it("dùng basename cố định khi cung cấp", () => {
    const key = buildStorageKey({ projectId: "p1", kind: "export", basename: "subtitle.srt" })
    expect(key).toBe("projects/p1/export/subtitle.srt")
  })

  it("bỏ ext không hợp lệ", () => {
    const key = buildStorageKey({ projectId: "p1", kind: "source", filename: "novideo" })
    expect(key).toMatch(/^projects\/p1\/source\/[a-f0-9-]+$/)
  })
})
