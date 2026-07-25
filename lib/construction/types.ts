/** DTO cho module Quản lý công trình (BigInt → number, Date → ISO string). */

export type ConstructionStatusDTO = "PLANNING" | "IN_PROGRESS" | "PAUSED" | "COMPLETED"
export type MilestoneStatusDTO = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "DELAYED"
export type ConstructionFileKindDTO = "PLAN" | "BUDGET" | "OTHER"

export interface PhotoDTO {
  id: string
  caption: string | null
  sortOrder: number
  /** URL stream ảnh qua API (client dùng trực tiếp cho <img>). */
  url: string
}

export interface UpdateDTO {
  id: string
  note: string
  authorName: string | null
  createdAt: string
  photos: PhotoDTO[]
}

export interface MilestoneDTO {
  id: string
  name: string
  plannedStart: string | null
  plannedEnd: string | null
  status: MilestoneStatusDTO
  percent: number
  note: string | null
  sortOrder: number
}

export interface CostItemDTO {
  id: string
  name: string
  estimatedVnd: number
  actualVnd: number
  note: string | null
  sortOrder: number
}

export interface ProjectFileDTO {
  id: string
  kind: ConstructionFileKindDTO
  filename: string
  sizeBytes: number
  createdAt: string
  url: string
}

export interface ConstructionProjectDTO {
  id: string
  name: string
  description: string | null
  status: ConstructionStatusDTO
  startDate: string | null
  targetDate: string | null
  createdAt: string
  /** % tiến độ tổng = trung bình percent các hạng mục (0 nếu chưa có). */
  overallPercent: number
  totalEstimatedVnd: number
  totalActualVnd: number
  /** Ảnh mới nhất làm bìa (URL) — null nếu chưa có ảnh. */
  coverUrl: string | null
  updateCount: number
}

export interface ConstructionProjectDetailDTO extends ConstructionProjectDTO {
  updates: UpdateDTO[]
  milestones: MilestoneDTO[]
  costItems: CostItemDTO[]
  files: ProjectFileDTO[]
}
