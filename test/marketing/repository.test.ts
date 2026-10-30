import { Readable } from "node:stream"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConflictError, UpstreamError } from "@/lib/http"

const mocks = vi.hoisted(() => ({
  prisma: {
    mktPost: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
  facebook: { publish: vi.fn(), getPostStatus: vi.fn(), deletePost: vi.fn() },
  storage: { getObjectStream: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }))
vi.mock("@/lib/storage", () => ({ getStorage: () => mocks.storage }))
vi.mock("@/lib/marketing/connections", () => ({ getFacebookClient: () => mocks.facebook, listConnectedPages: vi.fn() }))

import { approvePost } from "@/lib/marketing/repository"

const NOW = new Date("2026-10-30T08:00:00Z")

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "post1",
    fbPageId: "111",
    pageName: "ASIA GROUP",
    status: "PENDING_REVIEW",
    message: "Xin chào",
    link: null,
    scheduledAt: null,
    authorName: "Mai",
    reviewerName: null,
    reviewNote: null,
    fbPostId: null,
    permalinkUrl: null,
    publishedAt: null,
    lastError: null,
    createdAt: NOW,
    updatedAt: NOW,
    media: [],
    metric: null,
    ...overrides,
  }
}

const review = { reviewerName: "Thảo", note: "" }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prisma.mktPost.updateMany.mockResolvedValue({ count: 1 })
  mocks.prisma.mktPost.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(row(data)),
  )
  mocks.storage.getObjectStream.mockImplementation(() => Promise.resolve(Readable.from([Buffer.from("anh")])))
})

describe("duyệt và đăng bài", () => {
  it("đăng ngay rồi lưu id bài, link bài và giờ đăng", async () => {
    mocks.prisma.mktPost.findUnique.mockResolvedValue(row())
    mocks.facebook.publish.mockResolvedValue("111_9")
    mocks.facebook.getPostStatus.mockResolvedValue({ permalinkUrl: "https://facebook.com/111/posts/9" })

    const result = await approvePost("post1", review, NOW)

    expect(result.status).toBe("PUBLISHED")
    expect(result.fbPostId).toBe("111_9")
    expect(result.permalinkUrl).toBe("https://facebook.com/111/posts/9")
    expect(result.publishedAt).toBe(NOW.toISOString())
  })

  it("bài hẹn giờ chuyển sang Đã lên lịch và gửi kèm ảnh theo thứ tự", async () => {
    const scheduledAt = new Date(NOW.getTime() + 60 * 60_000)
    mocks.prisma.mktPost.findUnique.mockResolvedValue(
      row({
        scheduledAt,
        media: [
          { storageKey: "marketing/media/a.jpg", contentType: "image/jpeg" },
          { storageKey: "marketing/media/b.png", contentType: "image/png" },
        ],
      }),
    )
    mocks.facebook.publish.mockResolvedValue("111_10")

    const result = await approvePost("post1", review, NOW)

    expect(result.status).toBe("SCHEDULED")
    const input = mocks.facebook.publish.mock.calls[0][0] as { photos: { filename: string }[]; scheduledAt: Date }
    expect(input.photos.map((p) => p.filename)).toEqual(["a.jpg", "b.png"])
    expect(input.scheduledAt).toBe(scheduledAt)
    expect(mocks.facebook.getPostStatus).not.toHaveBeenCalled()
  })

  it("không gọi Facebook khi người khác vừa duyệt bài này", async () => {
    mocks.prisma.mktPost.findUnique.mockResolvedValue(row())
    mocks.prisma.mktPost.updateMany.mockResolvedValue({ count: 0 })

    await expect(approvePost("post1", review, NOW)).rejects.toThrow(ConflictError)
    expect(mocks.facebook.publish).not.toHaveBeenCalled()
  })

  it("từ chối duyệt khi giờ hẹn đã quá, trước khi đụng tới Facebook", async () => {
    mocks.prisma.mktPost.findUnique.mockResolvedValue(row({ scheduledAt: new Date(NOW.getTime() - 60_000) }))

    await expect(approvePost("post1", review, NOW)).rejects.toThrow(/10 phút/)
    expect(mocks.prisma.mktPost.updateMany).not.toHaveBeenCalled()
  })

  it("Facebook lỗi thì bài chuyển sang Đăng lỗi kèm lý do", async () => {
    mocks.prisma.mktPost.findUnique.mockResolvedValue(row())
    mocks.facebook.publish.mockRejectedValue(new UpstreamError("Token Facebook đã hết hạn"))

    await expect(approvePost("post1", review, NOW)).rejects.toThrow(/hết hạn/)
    expect(mocks.prisma.mktPost.update).toHaveBeenCalledWith({
      where: { id: "post1" },
      data: { status: "FAILED", lastError: "Token Facebook đã hết hạn" },
    })
  })
})
