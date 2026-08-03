import type { MilestoneDTO, MilestoneStatusDTO } from "./types"

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatusDTO, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thi công",
  DONE: "Hoàn thành",
  DELAYED: "Chậm tiến độ",
}

export function progressStatus(percent: number, delayed: boolean): MilestoneStatusDTO {
  if (percent >= 100) return "DONE"
  if (delayed) return "DELAYED"
  if (percent <= 0) return "NOT_STARTED"
  return "IN_PROGRESS"
}

export function defaultMilestoneId(milestones: MilestoneDTO[]): string {
  return (
    milestones.find((milestone) => milestone.status === "DELAYED") ??
    milestones.find((milestone) => milestone.status === "IN_PROGRESS") ??
    milestones.find((milestone) => milestone.percent < 100) ??
    milestones[0]
  )?.id ?? ""
}

export function progressJournalNote(
  milestoneName: string,
  percent: number,
  status: MilestoneStatusDTO,
  note: string,
): string {
  return [
    `Hạng mục: ${milestoneName}`,
    `Tiến độ: ${percent}% · ${MILESTONE_STATUS_LABEL[status]}`,
    note.trim(),
  ].join("\n")
}
