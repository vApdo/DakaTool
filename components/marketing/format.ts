import type { MktPostDto } from "@/lib/marketing/types"

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** Mốc thời gian chính của bài: giờ đã đăng, giờ hẹn, hoặc "Đăng ngay khi duyệt". */
export function postTimeLabel(post: Pick<MktPostDto, "publishedAt" | "scheduledAt">): string {
  if (post.publishedAt) return `Đăng lúc ${formatDateTime(post.publishedAt)}`
  if (post.scheduledAt) return `Hẹn ${formatDateTime(post.scheduledAt)}`
  return "Đăng ngay khi duyệt"
}

/** Giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
