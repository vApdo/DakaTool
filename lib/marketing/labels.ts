import type { MktPostStatus } from "./types"

/** Nhãn trạng thái — dùng được cả ở server lẫn trình duyệt. */
export const STATUS_LABEL: Record<MktPostStatus, string> = {
  DRAFT: "Nháp",
  PENDING_REVIEW: "Chờ duyệt",
  REJECTED: "Bị từ chối",
  PUBLISHING: "Đang đăng",
  SCHEDULED: "Đã lên lịch",
  PUBLISHED: "Đã đăng",
  FAILED: "Đăng lỗi",
}
