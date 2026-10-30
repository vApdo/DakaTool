/**
 * Quy tắc chuyển trạng thái của bài viết — hàm thuần, không đụng DB hay Facebook.
 *
 *   DRAFT ──gửi duyệt──▶ PENDING_REVIEW ──duyệt──▶ PUBLISHING ──▶ SCHEDULED / PUBLISHED
 *                              │                        └──lỗi──▶ FAILED (duyệt lại được)
 *                              └──từ chối──▶ REJECTED (sửa → DRAFT)
 *   SCHEDULED ──huỷ lịch──▶ DRAFT
 */
import { ConflictError } from "@/lib/http"
import type { MktPostStatus } from "@prisma/client"
import { STATUS_LABEL } from "./labels"

export type PostAction = "edit" | "submit" | "approve" | "reject" | "cancel" | "delete"

/** Bài kẹt ở PUBLISHING quá lâu (hàm bị ngắt giữa chừng) thì cho duyệt lại. */
export const STUCK_PUBLISHING_MS = 5 * 60 * 1000
export const MIN_SCHEDULE_LEAD_MS = 10 * 60 * 1000
export const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000

const ALLOWED: Record<PostAction, MktPostStatus[]> = {
  edit: ["DRAFT", "PENDING_REVIEW", "REJECTED", "FAILED"],
  submit: ["DRAFT", "REJECTED", "FAILED"],
  approve: ["PENDING_REVIEW", "FAILED"],
  reject: ["PENDING_REVIEW", "FAILED"],
  cancel: ["SCHEDULED"],
  delete: ["DRAFT", "PENDING_REVIEW", "REJECTED", "FAILED", "SCHEDULED", "PUBLISHED"],
}

const ACTION_LABEL: Record<PostAction, string> = {
  edit: "sửa",
  submit: "gửi duyệt",
  approve: "duyệt",
  reject: "từ chối",
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
  // Cho phép duyệt lại bài bị kẹt ở PUBLISHING.
  return (
    action === "approve" &&
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

/** Sửa bài bị từ chối hoặc lỗi thì quay về nháp; bài chờ duyệt vẫn giữ chờ duyệt. */
export function statusAfterEdit(status: MktPostStatus): MktPostStatus {
  return status === "PENDING_REVIEW" ? "PENDING_REVIEW" : "DRAFT"
}

/** Giờ hẹn phải nằm trong cửa sổ Facebook chấp nhận. null (đăng ngay) luôn hợp lệ. */
export function assertScheduleWindow(scheduledAt: Date | null, now: Date = new Date()): void {
  if (scheduledAt === null) return
  const diff = scheduledAt.getTime() - now.getTime()
  if (diff < MIN_SCHEDULE_LEAD_MS) {
    throw new ConflictError("Giờ hẹn phải sau thời điểm hiện tại ít nhất 10 phút. Hãy chọn lại giờ hoặc chọn \"Đăng ngay\".")
  }
  if (diff > MAX_SCHEDULE_AHEAD_MS) {
    throw new ConflictError("Facebook chỉ cho hẹn giờ trong vòng 30 ngày tới.")
  }
}
