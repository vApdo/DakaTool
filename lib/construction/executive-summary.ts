import type {
  ConstructionProjectDTO,
  ConstructionProjectDetailDTO,
} from "@/lib/construction/types"

export type ExecutiveSignalLevel = "risk" | "warning" | "info"

export interface ExecutiveSignal {
  id: string
  level: ExecutiveSignalLevel
  title: string
  detail: string
}

export type ExecutiveHealth = "on_track" | "needs_data" | "attention" | "risk"

const DAY_MS = 86_400_000

function utcDay(value: Date): number {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / DAY_MS)
}

function isoDay(value: string): number {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function deadlineDeltaDays(targetDate: string | null, now = new Date()): number | null {
  if (!targetDate) return null
  return isoDay(targetDate) - utcDay(now)
}

export function projectSignals(
  project: ConstructionProjectDTO,
  now = new Date(),
): ExecutiveSignal[] {
  const signals: ExecutiveSignal[] = []
  const deadlineDelta = deadlineDeltaDays(project.targetDate, now)

  if (project.status === "PAUSED") {
    signals.push({
      id: "paused",
      level: "risk",
      title: "Công trình đang tạm dừng",
      detail: "Cần xác nhận nguyên nhân và kế hoạch tiếp tục.",
    })
  }

  if (deadlineDelta !== null && deadlineDelta < 0 && project.status !== "COMPLETED") {
    signals.push({
      id: "overdue",
      level: "risk",
      title: `Trễ mục tiêu ${Math.abs(deadlineDelta)} ngày`,
      detail: "Ngày hoàn thành mục tiêu đã qua nhưng công trình chưa hoàn tất.",
    })
  }

  if (project.totalEstimatedVnd > 0 && project.totalActualVnd > project.totalEstimatedVnd) {
    signals.push({
      id: "over-budget",
      level: "risk",
      title: "Chi phí đã vượt dự toán",
      detail: "Cần rà soát các khoản phát sinh và phương án ngân sách.",
    })
  }

  if (!project.targetDate && project.status !== "COMPLETED") {
    signals.push({
      id: "missing-target",
      level: "info",
      title: "Chưa có ngày hoàn thành mục tiêu",
      detail: "Ban lãnh đạo chưa có mốc thời gian để đối chiếu tiến độ.",
    })
  }

  if (project.totalEstimatedVnd === 0) {
    signals.push({
      id: "missing-budget",
      level: "info",
      title: "Chưa có dự toán ngân sách",
      detail: "Chưa thể đánh giá mức sử dụng và phần ngân sách còn lại.",
    })
  }

  if (project.updateCount === 0) {
    signals.push({
      id: "missing-updates",
      level: "info",
      title: "Chưa có báo cáo hiện trường",
      detail: "Cần bổ sung hình ảnh và ghi chú tiến độ mới nhất.",
    })
  }

  return signals
}

export function detailSignals(
  project: ConstructionProjectDetailDTO,
  now = new Date(),
): ExecutiveSignal[] {
  const signals = projectSignals(project, now)
  const delayed = project.milestones.filter((milestone) => milestone.status === "DELAYED")
  const missingDates = project.milestones.filter(
    (milestone) => !milestone.plannedStart || !milestone.plannedEnd,
  )
  const inconsistent = project.milestones.filter(
    (milestone) =>
      (milestone.status === "DONE" && milestone.percent !== 100) ||
      (milestone.status !== "DONE" && milestone.percent === 100),
  )
  const overBudgetItems = project.costItems.filter(
    (item) => item.estimatedVnd > 0 && item.actualVnd > item.estimatedVnd,
  )

  if (delayed.length > 0) {
    signals.push({
      id: "delayed-milestones",
      level: "warning",
      title: `${delayed.length} hạng mục chậm tiến độ`,
      detail: delayed.slice(0, 3).map((item) => item.name).join(", "),
    })
  }

  if (overBudgetItems.length > 0) {
    signals.push({
      id: "over-budget-items",
      level: "warning",
      title: `${overBudgetItems.length} hạng mục chi phí vượt dự toán`,
      detail: overBudgetItems.slice(0, 3).map((item) => item.name).join(", "),
    })
  }

  if (missingDates.length > 0) {
    signals.push({
      id: "missing-milestone-dates",
      level: "info",
      title: `${missingDates.length} hạng mục chưa đủ ngày kế hoạch`,
      detail: "Các hạng mục này chưa thể hiện đầy đủ trên biểu đồ tiến độ.",
    })
  }

  if (inconsistent.length > 0) {
    signals.push({
      id: "inconsistent-milestones",
      level: "warning",
      title: `${inconsistent.length} hạng mục có trạng thái chưa khớp`,
      detail: "Phần trăm hoàn thành và trạng thái cần được quản lý rà soát lại.",
    })
  }

  return signals.sort((a, b) => signalPriority(a.level) - signalPriority(b.level))
}

export function executiveHealth(signals: ExecutiveSignal[]): ExecutiveHealth {
  if (signals.some((signal) => signal.level === "risk")) return "risk"
  if (signals.some((signal) => signal.level === "warning")) return "attention"
  if (signals.some((signal) => signal.level === "info")) return "needs_data"
  return "on_track"
}

function signalPriority(level: ExecutiveSignalLevel): number {
  if (level === "risk") return 0
  if (level === "warning") return 1
  return 2
}
