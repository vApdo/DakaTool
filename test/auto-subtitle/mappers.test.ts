import { describe, expect, it } from "vitest"
import { toSubtitleStyle } from "@/lib/auto-subtitle/mappers"
import { DEFAULT_SUBTITLE_STYLE } from "@/lib/auto-subtitle/constants"

describe("toSubtitleStyle", () => {
  it("trả style mặc định khi json rỗng/null", () => {
    expect(toSubtitleStyle(null)).toEqual(DEFAULT_SUBTITLE_STYLE)
    expect(toSubtitleStyle(undefined)).toEqual(DEFAULT_SUBTITLE_STYLE)
  })
  it("merge partial lên mặc định", () => {
    const merged = toSubtitleStyle({ fontSize: 72 })
    expect(merged.fontSize).toBe(72)
    expect(merged.fontName).toBe(DEFAULT_SUBTITLE_STYLE.fontName)
  })
})
