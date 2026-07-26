/** Prisma row → DTO cho module công trình (BigInt→number, Date→ISO, URL media). */
import type {
  ConstructionCostItem,
  ConstructionFile,
  ConstructionMilestone,
  ConstructionPhoto,
  ConstructionProject,
  ConstructionUpdate,
} from "@prisma/client"
import type {
  ConstructionProjectDTO,
  ConstructionProjectDetailDTO,
  CostItemDTO,
  MilestoneDTO,
  PhotoDTO,
  ProjectFileDTO,
  UpdateDTO,
} from "./types"

export function photoUrl(photoId: string): string {
  return `/api/construction/media/${photoId}`
}
export function fileUrl(fileId: string): string {
  return `/api/construction/files/${fileId}/download`
}

const iso = (d: Date | null) => (d ? d.toISOString() : null)

export function toPhotoDTO(p: ConstructionPhoto): PhotoDTO {
  return { id: p.id, caption: p.caption, sortOrder: p.sortOrder, url: photoUrl(p.id) }
}

export function toUpdateDTO(u: ConstructionUpdate & { photos: ConstructionPhoto[] }): UpdateDTO {
  return {
    id: u.id,
    note: u.note,
    authorName: u.authorName,
    createdAt: u.createdAt.toISOString(),
    photos: [...u.photos].sort((a, b) => a.sortOrder - b.sortOrder).map(toPhotoDTO),
  }
}

export function toMilestoneDTO(m: ConstructionMilestone): MilestoneDTO {
  return {
    id: m.id,
    name: m.name,
    plannedStart: iso(m.plannedStart),
    plannedEnd: iso(m.plannedEnd),
    status: m.status,
    percent: m.percent,
    note: m.note,
    sortOrder: m.sortOrder,
  }
}

export function toCostItemDTO(c: ConstructionCostItem): CostItemDTO {
  return {
    id: c.id,
    name: c.name,
    estimatedVnd: Number(c.estimatedVnd),
    actualVnd: Number(c.actualVnd),
    note: c.note,
    sortOrder: c.sortOrder,
  }
}

export function toProjectFileDTO(f: ConstructionFile): ProjectFileDTO {
  return {
    id: f.id,
    kind: f.kind,
    filename: f.filename,
    sizeBytes: Number(f.sizeBytes),
    createdAt: f.createdAt.toISOString(),
    url: fileUrl(f.id),
  }
}

export function overallPercent(milestones: Pick<ConstructionMilestone, "percent">[]): number {
  if (milestones.length === 0) return 0
  const sum = milestones.reduce((acc, m) => acc + m.percent, 0)
  return Math.round(sum / milestones.length)
}

type ProjectWithRelations = ConstructionProject & {
  milestones: ConstructionMilestone[]
  costItems: ConstructionCostItem[]
  updates: (ConstructionUpdate & { photos: ConstructionPhoto[] })[]
  files: ConstructionFile[]
}

export function toProjectDTO(
  p: ConstructionProject & {
    milestones: Pick<ConstructionMilestone, "percent">[]
    costItems: Pick<ConstructionCostItem, "estimatedVnd" | "actualVnd">[]
  },
  coverPhotoId: string | null,
  updateCount: number,
): ConstructionProjectDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    startDate: iso(p.startDate),
    targetDate: iso(p.targetDate),
    createdAt: p.createdAt.toISOString(),
    overallPercent: overallPercent(p.milestones),
    totalEstimatedVnd: p.costItems.reduce((a, c) => a + Number(c.estimatedVnd), 0),
    totalActualVnd: p.costItems.reduce((a, c) => a + Number(c.actualVnd), 0),
    coverUrl: coverPhotoId ? photoUrl(coverPhotoId) : null,
    updateCount,
  }
}

export function toProjectDetailDTO(p: ProjectWithRelations): ConstructionProjectDetailDTO {
  const coverPhotoId = p.updates.flatMap((u) => u.photos)[0]?.id ?? null
  return {
    ...toProjectDTO(p, coverPhotoId, p.updates.length),
    updates: p.updates.map(toUpdateDTO),
    milestones: [...p.milestones].sort((a, b) => a.sortOrder - b.sortOrder).map(toMilestoneDTO),
    costItems: [...p.costItems].sort((a, b) => a.sortOrder - b.sortOrder).map(toCostItemDTO),
    files: p.files.map(toProjectFileDTO),
  }
}
