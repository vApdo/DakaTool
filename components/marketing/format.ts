import type { MktPostDto } from "@/lib/marketing/types"

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" })
const clock = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Thời gian kiểu Facebook: "Vừa xong", "5 phút", "3 giờ", "Hôm qua lúc 20:23", "29 tháng 10 lúc 20:23". */
export function facebookTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diff = now.getTime() - date.getTime()
  const at = clock.format(date)
  if (diff >= 0 && diff < 60_000) return "Vừa xong"
  if (diff >= 0 && diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`
  if (diff >= 0 && diff < 86_400_000 && sameDay(date, now)) return `${Math.floor(diff / 3_600_000)} giờ`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return `Hôm qua lúc ${at}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (sameDay(date, now)) return `Hôm nay lúc ${at}`
  if (sameDay(date, tomorrow)) return `Ngày mai lúc ${at}`
  const year = date.getFullYear() === now.getFullYear() ? "" : `, ${date.getFullYear()}`
  return `${date.getDate()} tháng ${date.getMonth() + 1}${year} lúc ${at}`
}

/** Dòng thời gian dưới tên Fanpage của một bài. */
export function postTimeLabel(post: Pick<MktPostDto, "status" | "publishedAt" | "scheduledAt" | "updatedAt">): string {
  if (post.publishedAt) return facebookTime(post.publishedAt)
  if (post.status === "SCHEDULED" && post.scheduledAt) return `Sẽ đăng ${facebookTime(post.scheduledAt).toLowerCase()}`
  if (post.scheduledAt) return `Hẹn ${facebookTime(post.scheduledAt).toLowerCase()} · sửa ${facebookTime(post.updatedAt).toLowerCase()}`
  return `Sửa ${facebookTime(post.updatedAt).toLowerCase()}`
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
