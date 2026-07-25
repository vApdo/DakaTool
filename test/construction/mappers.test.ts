import { describe, expect, it } from "vitest"
import { overallPercent, photoUrl, fileUrl } from "@/lib/construction/mappers"

describe("overallPercent", () => {
  it("trung bình các hạng mục", () => {
    expect(overallPercent([{ percent: 100 }, { percent: 50 }, { percent: 0 }])).toBe(50)
  })
  it("làm tròn về số nguyên", () => {
    expect(overallPercent([{ percent: 100 }, { percent: 0 }, { percent: 0 }])).toBe(33)
  })
  it("chưa có hạng mục → 0", () => {
    expect(overallPercent([])).toBe(0)
  })
})

describe("URL media", () => {
  it("ảnh trỏ đúng endpoint stream", () => {
    expect(photoUrl("p1")).toBe("/api/construction/media/p1")
  })
  it("tài liệu trỏ đúng endpoint download", () => {
    expect(fileUrl("f1")).toBe("/api/construction/files/f1/download")
  })
})
