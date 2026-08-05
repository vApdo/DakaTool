import { describe, expect, it } from "vitest"
import {
  defaultMilestoneId,
  progressJournalNote,
  progressStatus,
} from "@/lib/construction/progress-update"
import type { MilestoneDTO } from "@/lib/construction/types"

const milestone = (over: Partial<MilestoneDTO>): MilestoneDTO => ({
  id: "ms-1",
  name: "Thi công móng",
  plannedStart: null,
  plannedEnd: null,
  status: "NOT_STARTED",
  percent: 0,
  note: null,
  sortOrder: 0,
  ...over,
})

describe("progressStatus", () => {
  it("tự đồng bộ trạng thái với phần trăm", () => {
    expect(progressStatus(0, false)).toBe("NOT_STARTED")
    expect(progressStatus(45, false)).toBe("IN_PROGRESS")
    expect(progressStatus(100, true)).toBe("DONE")
  })

  it("giữ cảnh báo chậm cho hạng mục chưa hoàn thành", () => {
    expect(progressStatus(45, true)).toBe("DELAYED")
  })
})

describe("defaultMilestoneId", () => {
  it("ưu tiên hạng mục chậm rồi đến hạng mục đang làm", () => {
    const milestones = [
      milestone({ id: "todo" }),
      milestone({ id: "doing", status: "IN_PROGRESS", percent: 40 }),
      milestone({ id: "late", status: "DELAYED", percent: 20 }),
    ]
    expect(defaultMilestoneId(milestones)).toBe("late")
  })
})

describe("progressJournalNote", () => {
  it("tạo nhật ký dễ đọc cho lãnh đạo", () => {
    expect(progressJournalNote("Thi công móng", 75, "IN_PROGRESS", "Đã đổ trục A–C")).toBe(
      "Hạng mục: Thi công móng\nTiến độ: 75% · Đang thi công\nĐã đổ trục A–C",
    )
  })
})
