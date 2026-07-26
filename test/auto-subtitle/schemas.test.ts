import { describe, expect, it } from "vitest"
import {
  bulkUpdateSegmentsSchema,
  createExportSchema,
  createProjectSchema,
  subtitleStyleSchema,
  updateSegmentSchema,
} from "@/lib/auto-subtitle/schemas"
import { MAX_VIDEO_SIZE_BYTES } from "@/lib/auto-subtitle/constants"

describe("createProjectSchema", () => {
  it("chấp nhận input hợp lệ và mặc định language=auto", () => {
    const parsed = createProjectSchema.parse({
      filename: "video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1000,
    })
    expect(parsed.language).toBe("auto")
  })

  it("từ chối MIME không hỗ trợ", () => {
    expect(() =>
      createProjectSchema.parse({ filename: "a.avi", mimeType: "video/avi", sizeBytes: 1 }),
    ).toThrow()
  })

  it("từ chối file vượt dung lượng", () => {
    expect(() =>
      createProjectSchema.parse({
        filename: "a.mp4",
        mimeType: "video/mp4",
        sizeBytes: MAX_VIDEO_SIZE_BYTES + 1,
      }),
    ).toThrow()
  })
})

describe("updateSegmentSchema", () => {
  it("cần ít nhất một trường", () => {
    expect(() => updateSegmentSchema.parse({})).toThrow()
  })
  it("endMs phải lớn hơn startMs", () => {
    expect(() => updateSegmentSchema.parse({ startMs: 1000, endMs: 500 })).toThrow()
    expect(updateSegmentSchema.parse({ startMs: 500, endMs: 1000 })).toBeTruthy()
  })
  it("cho phép chỉ sửa text", () => {
    expect(updateSegmentSchema.parse({ text: "xin chào" })).toBeTruthy()
  })
})

describe("bulkUpdateSegmentsSchema", () => {
  it("từ chối mảng rỗng", () => {
    expect(() => bulkUpdateSegmentsSchema.parse({ segments: [] })).toThrow()
  })
  it("chấp nhận danh sách segment", () => {
    const parsed = bulkUpdateSegmentsSchema.parse({
      segments: [{ id: "a", startMs: 0, endMs: 1000, text: "hi" }],
    })
    expect(parsed.segments).toHaveLength(1)
  })
})

describe("subtitleStyleSchema", () => {
  it("validate màu hex", () => {
    expect(() =>
      subtitleStyleSchema.parse({
        fontName: "DejaVu Sans",
        fontSize: 56,
        primaryColor: "white",
        outlineColor: "#000000",
        outlineWidth: 4,
        position: "bottom",
        marginV: 80,
        backgroundEnabled: false,
        backgroundColor: "#000000",
        backgroundOpacity: 0.5,
      }),
    ).toThrow()
  })
})

describe("createExportSchema", () => {
  it("SRT không cần style", () => {
    expect(createExportSchema.parse({ type: "SRT" })).toEqual({ type: "SRT" })
  })
  it("BURNED_MP4 cho phép style tùy chọn", () => {
    expect(createExportSchema.parse({ type: "BURNED_MP4" }).type).toBe("BURNED_MP4")
  })
  it("từ chối type lạ", () => {
    expect(() => createExportSchema.parse({ type: "GIF" })).toThrow()
  })
})
