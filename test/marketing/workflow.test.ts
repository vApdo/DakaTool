import { describe, expect, it } from "vitest"
import { ConflictError } from "@/lib/http"
import {
  STUCK_PUBLISHING_MS,
  assertCanPerform,
  assertScheduleWindow,
  canPerform,
  isOnFacebook,
} from "@/lib/marketing/workflow"

const NOW = new Date("2026-10-30T08:00:00Z")
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000)

describe("chuyển trạng thái bài viết", () => {
  it("đăng được bài nháp hoặc bài đăng lỗi, không đăng lại bài đã lên Facebook", () => {
    expect(canPerform("publish", "DRAFT")).toBe(true)
    expect(canPerform("publish", "FAILED")).toBe(true)
    expect(canPerform("publish", "SCHEDULED")).toBe(false)
    expect(canPerform("publish", "PUBLISHED")).toBe(false)
  })

  it("cho đăng lại bài kẹt ở PUBLISHING quá lâu, nhưng không phải bài đang đăng", () => {
    const fresh = new Date(NOW.getTime() - 1000)
    const stuck = new Date(NOW.getTime() - STUCK_PUBLISHING_MS - 1000)
    expect(canPerform("publish", "PUBLISHING", fresh, NOW)).toBe(false)
    expect(canPerform("publish", "PUBLISHING", stuck, NOW)).toBe(true)
  })

  it("không cho sửa bài đã lên Facebook", () => {
    expect(() => assertCanPerform("edit", "SCHEDULED")).toThrow(ConflictError)
    expect(() => assertCanPerform("edit", "PUBLISHED")).toThrow(/Đã đăng/)
  })

  it("chỉ huỷ lịch được bài đã lên lịch", () => {
    expect(canPerform("cancel", "SCHEDULED")).toBe(true)
    expect(canPerform("cancel", "PUBLISHED")).toBe(false)
  })

  it("bài đã đăng hoặc đã hẹn giờ thì đang nằm trên Facebook", () => {
    expect(isOnFacebook("SCHEDULED")).toBe(true)
    expect(isOnFacebook("PUBLISHED")).toBe(true)
    expect(isOnFacebook("DRAFT")).toBe(false)
    expect(isOnFacebook("FAILED")).toBe(false)
  })
})

describe("cửa sổ hẹn giờ", () => {
  it("đăng ngay luôn hợp lệ", () => {
    expect(() => assertScheduleWindow(null, NOW)).not.toThrow()
  })

  it("từ chối giờ hẹn dưới 10 phút hoặc đã qua", () => {
    expect(() => assertScheduleWindow(minutes(5), NOW)).toThrow(/10 phút/)
    expect(() => assertScheduleWindow(minutes(-60), NOW)).toThrow(/10 phút/)
  })

  it("nhận giờ hẹn trong 10 phút → 30 ngày", () => {
    expect(() => assertScheduleWindow(minutes(11), NOW)).not.toThrow()
    expect(() => assertScheduleWindow(minutes(29 * 24 * 60), NOW)).not.toThrow()
  })

  it("từ chối giờ hẹn quá 30 ngày", () => {
    expect(() => assertScheduleWindow(minutes(31 * 24 * 60), NOW)).toThrow(/30 ngày/)
  })
})
