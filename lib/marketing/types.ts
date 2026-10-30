import type { MktPostStatus } from "@prisma/client"

export type { MktPostStatus }

export interface MktMediaDto {
  id: string
  key: string
  contentType: string
  sizeBytes: number
  /** URL xem ảnh qua API (đã kiểm tra mã truy cập). */
  url: string
}

export interface MktMetricDto {
  views: number | null
  uniqueViews: number | null
  clicks: number | null
  reactions: number | null
  comments: number | null
  shares: number | null
  fetchedAt: string
}

export interface MktPostDto {
  id: string
  fbPageId: string
  pageName: string
  status: MktPostStatus
  message: string
  link: string | null
  scheduledAt: string | null
  authorName: string
  fbPostId: string | null
  permalinkUrl: string | null
  publishedAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
  media: MktMediaDto[]
  metric: MktMetricDto | null
}

export interface MktPageDto {
  id: string
  name: string
}

export interface MktConnectionDto {
  /** Đã đặt FB_APP_ID và FB_APP_SECRET. */
  configured: boolean
  pages: MktPageDto[]
  connectedBy: string | null
  connectedAt: string | null
}
