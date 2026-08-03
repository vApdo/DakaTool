import { describe, expect, it } from "vitest"
import {
  deadlineDeltaDays,
  detailSignals,
  executiveHealth,
  projectSignals,
} from "@/lib/construction/executive-summary"
import type { ConstructionProjectDTO, ConstructionProjectDetailDTO } from "@/lib/construction/types"

const baseProject: ConstructionProjectDTO = {
  id: "p1",
  name: "Xưởng HQT",
  description: null,
  status: "IN_PROGRESS",
  startDate: "2026-07-01T00:00:00.000Z",
  targetDate: "2026-08-20T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  overallPercent: 45,
  totalEstimatedVnd: 1_000_000_000,
  totalActualVnd: 400_000_000,
  coverUrl: null,
  updateCount: 2,
}

describe("deadlineDeltaDays", () => {
  it("tính theo ngày, không phụ thuộc giờ trong ngày", () => {
    expect(deadlineDeltaDays("2026-08-20T00:00:00.000Z", new Date("2026-08-18T23:00:00.000Z"))).toBe(2)
  })
})

describe("projectSignals", () => {
  it("không cảnh báo khi dữ liệu đầy đủ và dự án đúng kế hoạch", () => {
    const signals = projectSignals(baseProject, new Date("2026-08-01T00:00:00.000Z"))
    expect(signals).toEqual([])
    expect(executiveHealth(signals)).toBe("on_track")
  })

  it("ưu tiên rủi ro khi công trình trễ và vượt dự toán", () => {
    const signals = projectSignals(
      { ...baseProject, targetDate: "2026-07-30T00:00:00.000Z", totalActualVnd: 1_100_000_000 },
      new Date("2026-08-03T00:00:00.000Z"),
    )
    expect(signals.map((signal) => signal.id)).toEqual(["overdue", "over-budget"])
    expect(executiveHealth(signals)).toBe("risk")
  })
})

describe("detailSignals", () => {
  it("phát hiện hạng mục chậm, thiếu ngày và trạng thái không khớp", () => {
    const detail: ConstructionProjectDetailDTO = {
      ...baseProject,
      updates: [],
      costItems: [],
      files: [],
      milestones: [
        {
          id: "m1",
          name: "Đào móng",
          plannedStart: null,
          plannedEnd: null,
          status: "DELAYED",
          percent: 100,
          note: null,
          sortOrder: 0,
        },
      ],
    }
    const signals = detailSignals(detail, new Date("2026-08-01T00:00:00.000Z"))
    expect(signals.map((signal) => signal.id)).toEqual([
      "delayed-milestones",
      "inconsistent-milestones",
      "missing-milestone-dates",
    ])
    expect(executiveHealth(signals)).toBe("attention")
  })
})
