"use client"

import { useMemo } from "react"
import type { MilestoneDTO, MilestoneStatusDTO } from "@/lib/construction/types"

/**
 * Biểu đồ Gantt cho các hạng mục thi công.
 *
 * Cách canh cột: mỗi tháng rộng theo ĐÚNG số ngày của nó (tháng 2 hẹp hơn tháng 1),
 * nhờ vậy vị trí thanh tính bằng số ngày là khớp tuyệt đối với vạch chia tháng.
 * Nếu chia đều mọi tháng thì thanh sẽ lệch dần vài pixel mỗi tháng — nhìn thì nhỏ
 * nhưng người đọc biểu đồ tiến độ lại soi đúng chỗ đó.
 *
 * Không co giãn theo bề rộng màn hình mà cuộn ngang: công trình kéo dài 1-2 năm
 * mà ép vừa màn điện thoại thì mỗi tháng còn ~15px, không đọc được gì.
 */

const DAY_MS = 86_400_000
/**
 * Bề rộng một ngày, khai báo bằng biến CSS để đổi theo khổ màn: 1,7px trên điện
 * thoại (tháng ~51px, nhìn được ~5 tháng cùng lúc) và 3px từ 640px trở lên.
 * Để cứng 3px thì màn 390px chỉ hiện 2 tháng — mở ra hầu hết hàng đều trống,
 * trông như mất dữ liệu.
 */
const DAY_VAR = "[--px-day:1.7px] sm:[--px-day:3px]"
/** Bề rộng theo số ngày, tính bằng CSS nên tự đổi theo biến ở trên. */
const span = (days: number) => `calc(var(--px-day) * ${days})`
/**
 * Cột tên dính bên trái. Bề rộng khai báo một lần bằng biến CSS để vạch "hôm nay"
 * (nằm ngoài cột, tính bằng px) luôn dịch đúng bằng bề rộng cột ở cả hai khổ màn.
 */
const NAME_COL_VAR = "[--name-col:132px] sm:[--name-col:180px]"
const NAME_COL = "w-[var(--name-col)]"
/** Nền đục cho ô dính — trong suốt thì thanh Gantt chạy lộ ra dưới tên hạng mục. */
const STICKY_BG = "bg-[color:var(--background)]"

const STATUS_BAR: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "bg-gray-300 dark:bg-gray-700",
  IN_PROGRESS: "bg-primary",
  DONE: "bg-green-600 dark:bg-green-500",
  DELAYED: "bg-amber-500",
}
/**
 * Màu chữ % đặt trên thanh. Không dùng chung text-white được: nền "Đang làm" ở
 * giao diện tối là màu bạc hà rất sáng, chữ trắng trên đó gần như không đọc nổi.
 */
const STATUS_TEXT: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "text-gray-700 dark:text-gray-100",
  IN_PROGRESS: "text-[color:var(--primary-foreground)]",
  DONE: "text-white",
  DELAYED: "text-amber-950",
}
const STATUS_LABEL: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  DELAYED: "Chậm tiến độ",
}

/** Số ngày kể từ mốc 0 của lịch — dùng UTC để không bị lệch một ngày theo múi giờ. */
function dayIndex(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

interface Placed {
  milestone: MilestoneDTO
  startDay: number
  endDay: number
}

interface MonthCol {
  year: number
  month: number
  days: number
  startDay: number
}

export function MilestoneGantt({ milestones }: { milestones: MilestoneDTO[] }) {
  const model = useMemo(() => {
    const placed: Placed[] = []
    const undated: MilestoneDTO[] = []

    for (const m of milestones) {
      if (m.plannedStart && m.plannedEnd) {
        const startDay = dayIndex(m.plannedStart)
        const endDay = Math.max(startDay, dayIndex(m.plannedEnd))
        placed.push({ milestone: m, startDay, endDay })
      } else {
        undated.push(m)
      }
    }
    if (placed.length === 0) return null

    // Nới hai đầu nửa tháng cho thanh không dính sát mép.
    const rawFrom = Math.min(...placed.map((p) => p.startDay))
    const rawTo = Math.max(...placed.map((p) => p.endDay))
    const from = new Date((rawFrom - 15) * DAY_MS)
    const to = new Date((rawTo + 15) * DAY_MS)

    const months: MonthCol[] = []
    let y = from.getUTCFullYear()
    let mo = from.getUTCMonth()
    while (y < to.getUTCFullYear() || (y === to.getUTCFullYear() && mo <= to.getUTCMonth())) {
      months.push({
        year: y,
        month: mo,
        days: daysInMonth(y, mo),
        startDay: Math.floor(Date.UTC(y, mo, 1) / DAY_MS),
      })
      mo += 1
      if (mo > 11) {
        mo = 0
        y += 1
      }
    }

    const originDay = months[0].startDay
    const totalDays = months.reduce((sum, m) => sum + m.days, 0)

    // Gom tháng theo quý để có hàng tiêu đề trên cùng.
    const quarters: Array<{ label: string; days: number }> = []
    for (const m of months) {
      const label = `Quý ${Math.floor(m.month / 3) + 1}/${m.year}`
      const last = quarters[quarters.length - 1]
      if (last && last.label === label) last.days += m.days
      else quarters.push({ label, days: m.days })
    }

    return { placed, undated, months, quarters, originDay, totalDays }
  }, [milestones])

  if (!model) {
    return (
      <p className="text-sm text-gray-500">
        Chưa hạng mục nào có đủ ngày bắt đầu và kết thúc nên chưa vẽ được biểu đồ. Vào trang
        quản lý, mục Tiến độ để nhập ngày.
      </p>
    )
  }

  const { placed, undated, months, quarters, originDay, totalDays } = model
  const todayDays = Math.floor(Date.now() / DAY_MS) - originDay
  const todayVisible = todayDays >= 0 && todayDays <= totalDays

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <div className={`min-w-max ${NAME_COL_VAR} ${DAY_VAR}`}>
            {/* Hàng quý */}
            <div className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60">
              <div
                className={`${NAME_COL} ${STICKY_BG} sticky left-0 z-20 shrink-0 border-r border-gray-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800`}
              >
                Hạng mục
              </div>
              {quarters.map((q, i) => (
                <div
                  key={i}
                  style={{ width: span(q.days) }}
                  className="shrink-0 border-r border-gray-200 py-1.5 text-center text-[11px] font-semibold text-gray-600 last:border-r-0 dark:border-gray-800 dark:text-gray-400"
                >
                  {q.label}
                </div>
              ))}
            </div>

            {/* Hàng tháng */}
            <div className="flex border-b border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/30">
              <div
                className={`${NAME_COL} ${STICKY_BG} sticky left-0 z-20 shrink-0 border-r border-gray-200 dark:border-gray-800`}
              />
              {months.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  style={{ width: span(m.days) }}
                  className="shrink-0 border-r border-gray-200 py-1 text-center text-[11px] text-gray-500 last:border-r-0 dark:border-gray-800"
                >
                  T{m.month + 1}
                </div>
              ))}
            </div>

            {/* Các hàng hạng mục */}
            <div className="relative">
              {todayVisible && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-0 z-10 h-full border-l-2 border-dashed border-red-400/70"
                  style={{ left: `calc(var(--name-col) + ${span(todayDays)})` }}
                />
              )}
              {placed.map(({ milestone: m, startDay, endDay }) => {
                const offsetDays = startDay - originDay
                // +1 vì ngày kết thúc được tính trọn ngày; tối thiểu 2 ngày để hạng
                // mục làm trong ngày vẫn còn một vệt nhìn thấy được.
                const lengthDays = Math.max(2, endDay - startDay + 1)
                return (
                  <div
                    key={m.id}
                    className="flex border-b border-gray-100 last:border-b-0 dark:border-gray-800/60"
                  >
                    <div
                      className={`${NAME_COL} ${STICKY_BG} sticky left-0 z-20 shrink-0 truncate border-r border-gray-200 px-3 py-2 text-xs font-medium text-black dark:border-gray-800 dark:text-white`}
                      title={m.name}
                    >
                      {m.name}
                    </div>
                    <div className="relative shrink-0 py-2" style={{ width: span(totalDays) }}>
                      {/* Vạch chia tháng */}
                      <div aria-hidden className="absolute inset-0 flex">
                        {months.map((mo) => (
                          <div
                            key={`${mo.year}-${mo.month}`}
                            style={{ width: span(mo.days) }}
                            className="shrink-0 border-r border-gray-100 last:border-r-0 dark:border-gray-800/60"
                          />
                        ))}
                      </div>
                      <div
                        className={`relative flex h-6 items-center overflow-hidden rounded-md ${STATUS_BAR[m.status]}`}
                        style={{ marginLeft: span(offsetDays), width: span(lengthDays) }}
                        title={`${m.name} · ${STATUS_LABEL[m.status]} · ${m.percent}%`}
                      >
                        {/* Phần CHƯA làm bị phủ tối. Làm ngược lại (tô sáng phần đã
                            xong) khiến hạng mục 100% trông nhạt như chưa hoàn thành. */}
                        {m.percent < 100 && (
                          <div
                            className="absolute inset-y-0 right-0 bg-black/30 dark:bg-black/45"
                            style={{ width: `${100 - m.percent}%` }}
                          />
                        )}
                        <span
                          className={`relative truncate px-2 text-[11px] font-semibold ${STATUS_TEXT[m.status]}`}
                        >
                          {m.percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        {(Object.keys(STATUS_LABEL) as MilestoneStatusDTO[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_BAR[s]}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        {todayVisible && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0 border-l-2 border-dashed border-red-400" />
            Hôm nay
          </span>
        )}
        <span className="sm:hidden">Vuốt ngang để xem tiếp →</span>
      </div>

      {undated.length > 0 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {undated.length} hạng mục chưa có đủ ngày nên không nằm trên biểu đồ:{" "}
          {undated.map((m) => m.name).join(", ")}.
        </p>
      )}
    </div>
  )
}
