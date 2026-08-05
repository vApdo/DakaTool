import { describe, expect, it } from "vitest"
import {
  authSchema,
  bulkCostsSchema,
  bulkMilestonesSchema,
  createProjectSchema,
  createUpdateMetaSchema,
} from "@/lib/construction/schemas"

describe("createProjectSchema", () => {
  it("chấp nhận tên hợp lệ", () => {
    expect(createProjectSchema.parse({ name: "Xưởng cơ khí HQT" }).name).toBe("Xưởng cơ khí HQT")
  })
  it("từ chối tên rỗng", () => {
    expect(() => createProjectSchema.parse({ name: "   " })).toThrow()
  })
  it("từ chối ngày không hợp lệ", () => {
    expect(() => createProjectSchema.parse({ name: "A", startDate: "hôm qua" })).toThrow()
  })
})

describe("createUpdateMetaSchema", () => {
  it("bắt buộc có chú thích", () => {
    expect(() => createUpdateMetaSchema.parse({ note: "" })).toThrow()
  })
  it("chấp nhận caption theo thứ tự ảnh", () => {
    const meta = createUpdateMetaSchema.parse({ note: "Đổ móng xong", captions: ["Trục A", "Trục B"] })
    expect(meta.captions).toEqual(["Trục A", "Trục B"])
  })
  it("chấp nhận cập nhật hạng mục hợp lệ", () => {
    const meta = createUpdateMetaSchema.parse({
      note: "Đã đổ xong móng",
      milestoneUpdate: { id: "ms-1", percent: 75, status: "IN_PROGRESS", note: "Đã đổ xong móng" },
    })
    expect(meta.milestoneUpdate?.percent).toBe(75)
  })
  it("từ chối phần trăm hạng mục ngoài 0–100", () => {
    expect(() =>
      createUpdateMetaSchema.parse({
        note: "Sai dữ liệu",
        milestoneUpdate: { id: "ms-1", percent: 101, status: "IN_PROGRESS" },
      }),
    ).toThrow()
  })
  it("từ chối quá 10 caption", () => {
    expect(() =>
      createUpdateMetaSchema.parse({ note: "x", captions: Array(11).fill("a") }),
    ).toThrow()
  })
})

describe("bulkMilestonesSchema", () => {
  it("percent phải trong 0–100", () => {
    const row = { name: "Móng", status: "IN_PROGRESS" as const, percent: 120 }
    expect(() => bulkMilestonesSchema.parse({ milestones: [row] })).toThrow()
  })
  it("dòng không id = tạo mới", () => {
    const parsed = bulkMilestonesSchema.parse({
      milestones: [{ name: "Móng", status: "DONE", percent: 100 }],
    })
    expect(parsed.milestones[0].id).toBeUndefined()
  })
  it("từ chối trạng thái lạ", () => {
    expect(() =>
      bulkMilestonesSchema.parse({ milestones: [{ name: "X", status: "XONG", percent: 0 }] }),
    ).toThrow()
  })
})

describe("bulkCostsSchema", () => {
  it("từ chối số âm", () => {
    expect(() =>
      bulkCostsSchema.parse({ costItems: [{ name: "Thép", estimatedVnd: -1, actualVnd: 0 }] }),
    ).toThrow()
  })
  it("chấp nhận số tiền lớn", () => {
    const parsed = bulkCostsSchema.parse({
      costItems: [{ name: "Thép", estimatedVnd: 2_500_000_000, actualVnd: 1_000_000_000 }],
    })
    expect(parsed.costItems[0].estimatedVnd).toBe(2_500_000_000)
  })
})

describe("authSchema", () => {
  it("mã tối thiểu 4 ký tự", () => {
    expect(() => authSchema.parse({ code: "abc" })).toThrow()
    expect(authSchema.parse({ code: "abcd" }).code).toBe("abcd")
  })
})
