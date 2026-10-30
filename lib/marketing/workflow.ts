/**
 * Quy tắc chuyển trạng thái của bài viết — hàm thuần, không đụng DB hay Facebook.
 *
 *   DRAFT ──đăng──▶ PUBLISHING ──▶ SCHEDULED / PUBLISHED
 *                       └──lỗi──▶ FAILED (sửa hoặc đăng lại được)
 *   SCHEDULED ──huỷ lịch──▶ DRAFT
 */
import { ConflictError } from "@/lib/http"
import type { MktPostStatus } from "@prisma/client"
import { STATUS_LABEL } from "./labels"

export type PostAction = "edit" | "publish" | "cancel" | "delete"

/** Bài kẹt ở PUBLISHING quá lâu (hàm bị ngắt giữa chừng) thì cho đăng lại. */
export const STUCK_PUBLISHING_MS = 5 * 60 * 1000
export const MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000
export const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000

const ALLOWED: Record<PostAction, MktPostStatus[]> = {
  edit: ["DRAFT", "FAILED"],
  publish: ["DRAFT", "FAILED"],
  cancel: ["SCHEDULED"],
  delete: ["DRAFT", "FAILED", "SCHEDULED", "PUBLISHED"],
}

const ACTION_LABEL: Record<PostAction, string> = {
  edit: "sửa",
  publish: "đăng",
  cancel: "huỷ lịch",
  delete: "xoá",
}

export function canPerform(
  action: PostAction,
  status: MktPostStatus,
  updatedAt?: Date,
  now: Date = new Date(),
): boolean {
  if (ALLOWED[action].includes(status)) return true
  // Cho phép đăng lại bài bị kẹt ở PUBLISHING.
  return (
    action === "publish" &&
    status === "PUBLISHING" &&
    updatedAt !== undefined &&
    now.getTime() - updatedAt.getTime() > STUCK_PUBLISHING_MS
  )
}

export function assertCanPerform(action: PostAction, status: MktPostStatus, updatedAt?: Date, now?: Date): void {
  if (!canPerform(action, status, updatedAt, now)) {
    throw new ConflictError(`Không thể ${ACTION_LABEL[action]} bài đang ở trạng thái "${STATUS_LABEL[status]}".`)
  }
}

/** Bài đã nằm trên Fanpage (đã đăng hoặc đã hẹn giờ), xoá thì phải gỡ cả trên Facebook. */
export function isOnFacebook(status: MktPostStatus): boolean {
  return status === "SCHEDULED" || status === "PUBLISHED"
}

/** Giờ hẹn phải nằm trong cửa sổ Facebook chấp nhận. null (đăng ngay) luôn hợp lệ. */
export function assertScheduleWindow(scheduledAt: Date | null, now: Date = new Date()): void {
  if (scheduledAt === null) return
  const diff = scheduledAt.getTime() - now.getTime()
  if (diff < MIN_SCHEDULE_LEAD_MS) {
    throw new ConflictError("Giờ hẹn phải sau thời điểm hiện tại ít nhất 10 phút. Hãy chọn lại giờ hoặc bỏ hẹn giờ để đăng ngay.")
  }
  if (diff > MAX_SCHEDULE_AHEAD_MS) {
    throw new ConflictError("Facebook chỉ cho hẹn giờ trong vòng 30 ngày tới.")
  }
}
