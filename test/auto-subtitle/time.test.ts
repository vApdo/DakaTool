import { describe, expect, it } from "vitest"
import { clockToMs, msToClock } from "@/lib/auto-subtitle/time"

describe("msToClock", () => {
  it("định dạng HH:MM:SS.mmm", () => {
    expect(msToClock(0)).toBe("00:00:00.000")
    expect(msToClock(3_661_230)).toBe("01:01:01.230")
    expect(msToClock(1500)).toBe("00:00:01.500")
  })
  it("kẹp giá trị âm về 0", () => {
    expect(msToClock(-5)).toBe("00:00:00.000")
  })
})

describe("clockToMs", () => {
  it("parse HH:MM:SS.mmm", () => {
    expect(clockToMs("01:01:01.230")).toBe(3_661_230)
    expect(clockToMs("00:00:01.500")).toBe(1500)
  })
  it("parse MM:SS", () => {
    expect(clockToMs("02:05")).toBe(125_000)
  })
  it("chấp nhận dấu phẩy cho mili giây", () => {
    expect(clockToMs("00:00:01,250")).toBe(1250)
  })
  it("trả null với input sai", () => {
    expect(clockToMs("abc")).toBeNull()
    expect(clockToMs("00:99:99")).toBeNull()
  })
  it("là nghịch đảo của msToClock", () => {
    for (const ms of [0, 1500, 3_661_230, 59_999]) {
      expect(clockToMs(msToClock(ms))).toBe(ms)
    }
  })
})
