import { describe, expect, it } from "vitest"
import { ConflictError } from "@/lib/http"
import {
  STUCK_PUBLISHING_MS,
  assertCanPerform,
  assertScheduleWindow,
  canPerform,
  statusAfterEdit,
} from "@/lib/marketing/workflow"

const NOW = new Date("2026-10-30T08:00:00Z")
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000)

describe("chuyển trạng thái bài viết", () => {
  it("chỉ duyệt được bài chờ duyệt hoặc đăng lỗi", () => {
    expect(canPerform("approve", "PENDING_REVIEW")).toBe(true)
    expect(canPerform("approve", "FAILED")).toBe(true)
    expect(canPerform("approve", "DRAFT")).toBe(false)
    expect(canPerform("approve", "PUBLISHED")).toBe(false)
  })

  it("cho duyệt lại bài kẹt ở PUBLISHING quá lâu, nhưng không phải bài đang đăng", () => {
    const fresh = new Date(NOW.getTime() - 1000)
    const stuck = new Date(NOW.getTime() - STUCK_PUBLISHING_MS - 1000)
    expect(canPerform("approve", "PUBLISHING", fresh, NOW)).toBe(false)
    expect(canPerform("approve", "PUBLISHING", stuck, NOW)).toBe(true)
  })

  it("không cho sửa bài đã lên Facebook", () => {
    expect(() => assertCanPerform("edit", "SCHEDULED")).toThrow(ConflictError)
    expect(() => assertCanPerform("edit", "PUBLISHED")).toThrow(/Đã đăng/)
  })

  it("chỉ huỷ lịch được bài đã lên lịch", () => {
    expect(canPerform("cancel", "SCHEDULED")).toBe(true)
    expect(canPerform("cancel", "PUBLISHED")).toBe(false)
  })

  it("sửa bài bị từ chối hoặc lỗi thì về nháp, bài chờ duyệt giữ nguyên", () => {
    expect(statusAfterEdit("REJECTED")).toBe("DRAFT")
    expect(statusAfterEdit("FAILED")).toBe("DRAFT")
    expect(statusAfterEdit("PENDING_REVIEW")).toBe("PENDING_REVIEW")
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
