/**
 * Test hồi quy cho lớp ghi dữ liệu của module Quản lý công trình.
 *
 * Trọng tâm là lỗi ĐÃ TỪNG xảy ra thật: `saveMilestones`/`saveCostItems` nhận
 * danh sách id từ client rồi gọi `update({ where: { id } })`. Prisma chỉ lọc
 * theo id nên một id thuộc công trình KHÁC vẫn bị ghi đè; tệ hơn,
 * `deleteMany({ projectId, id: { notIn: keepIds } })` khi đó lại xoá sạch các
 * dòng thật của công trình đang sửa (vì không id nào trong keepIds thuộc về nó).
 * Hỏng dữ liệu hai chiều chỉ bằng một request.
 *
 * Nên các test dưới đây không chỉ kiểm "có ném lỗi không", mà kiểm cả
 * "$transaction có bị gọi không" — chặn phải xảy ra TRƯỚC khi ghi.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createUpdate, saveMilestones, saveCostItems } from "@/lib/construction/repository"
import { AccessError, ConflictError } from "@/lib/http"

// vi.hoisted: mock phải tồn tại TRƯỚC khi module dưới test được nạp.
const prismaMock = vi.hoisted(() => ({
  constructionProject: { findUnique: vi.fn() },
  constructionMilestone: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  constructionUpdate: { create: vi.fn() },
  constructionCostItem: { findMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const PROJECT = "prj-a"

function milestone(over: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Thi công móng",
    plannedStart: null,
    plannedEnd: null,
    status: "IN_PROGRESS" as const,
    percent: 50,
    note: null,
    ...over,
  }
}

function cost(over: Partial<Record<string, unknown>> = {}) {
  return { name: "Thép", estimatedVnd: 1000, actualVnd: 500, note: null, ...over }
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.constructionProject.findUnique.mockResolvedValue({ id: PROJECT })
  // deleteMany/update/create trong $transaction chỉ cần trả về "một promise gì đó".
  prismaMock.constructionMilestone.deleteMany.mockReturnValue({ op: "deleteMany" })
  prismaMock.constructionMilestone.update.mockReturnValue({ op: "update" })
  prismaMock.constructionMilestone.create.mockReturnValue({ op: "create" })
  prismaMock.constructionCostItem.deleteMany.mockReturnValue({ op: "deleteMany" })
  prismaMock.constructionCostItem.update.mockReturnValue({ op: "update" })
  prismaMock.constructionCostItem.create.mockReturnValue({ op: "create" })
  prismaMock.$transaction.mockResolvedValue([])
})

describe("saveMilestones", () => {
  it("từ chối id thuộc công trình khác và KHÔNG ghi gì", async () => {
    // Client gửi 2 id nhưng chỉ 1 id thực sự thuộc công trình này.
    prismaMock.constructionMilestone.findMany.mockResolvedValue([{ id: "ms-cua-toi" }])

    await expect(
      saveMilestones(PROJECT, {
        milestones: [
          milestone({ id: "ms-cua-toi" }),
          milestone({ id: "ms-cua-cong-trinh-khac" }),
        ],
      } as never),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.constructionMilestone.deleteMany).not.toHaveBeenCalled()
  })

  it("truy vấn kiểm tra phải lọc theo CẢ id lẫn projectId", async () => {
    prismaMock.constructionMilestone.findMany.mockResolvedValue([{ id: "ms-1" }])
    await saveMilestones(PROJECT, { milestones: [milestone({ id: "ms-1" })] } as never)

    expect(prismaMock.constructionMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["ms-1"] }, projectId: PROJECT } }),
    )
  })

  it("từ chối id đã bị người khác xoá (thiếu dòng) thay vì để Prisma ném P2025", async () => {
    prismaMock.constructionMilestone.findMany.mockResolvedValue([])

    await expect(
      saveMilestones(PROJECT, { milestones: [milestone({ id: "ms-da-bi-xoa" })] } as never),
    ).rejects.toBeInstanceOf(ConflictError)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("công trình không tồn tại → not_found, không đụng tới bảng hạng mục", async () => {
    prismaMock.constructionProject.findUnique.mockResolvedValue(null)

    await expect(
      saveMilestones("prj-khong-co", { milestones: [milestone()] } as never),
    ).rejects.toBeInstanceOf(AccessError)
    expect(prismaMock.constructionMilestone.findMany).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("id hợp lệ → ghi trong MỘT transaction, xoá đúng các dòng vắng mặt", async () => {
    prismaMock.constructionMilestone.findMany.mockResolvedValue([{ id: "ms-1" }])

    await saveMilestones(PROJECT, {
      milestones: [milestone({ id: "ms-1" }), milestone({ name: "Dòng mới" })],
    } as never)

    expect(prismaMock.constructionMilestone.deleteMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT, id: { notIn: ["ms-1"] } },
    })
    expect(prismaMock.constructionMilestone.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.constructionMilestone.create).toHaveBeenCalledTimes(1)
    // deleteMany + update + create phải nằm chung một transaction.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(3)
  })

  it("toàn dòng mới (không id) → bỏ qua bước kiểm tra, vẫn xoá dòng cũ", async () => {
    await saveMilestones(PROJECT, { milestones: [milestone()] } as never)

    expect(prismaMock.constructionMilestone.findMany).not.toHaveBeenCalled()
    expect(prismaMock.constructionMilestone.deleteMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT, id: { notIn: [] } },
    })
  })

  it("thứ tự trong mảng được lưu thành sortOrder", async () => {
    await saveMilestones(PROJECT, {
      milestones: [milestone({ name: "A" }), milestone({ name: "B" })],
    } as never)

    const orders = prismaMock.constructionMilestone.create.mock.calls.map(
      (c) => c[0].data.sortOrder,
    )
    expect(orders).toEqual([0, 1])
  })
})

describe("createUpdate", () => {
  it("lưu % hạng mục và nhật ký trong cùng một transaction", async () => {
    prismaMock.constructionMilestone.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.constructionUpdate.create.mockResolvedValue({
      id: "up-1",
      projectId: PROJECT,
      note: "Hạng mục: Móng\nTiến độ: 75%\nĐã đổ trục A–C",
      authorName: "Anh Nam",
      createdAt: new Date("2026-08-03T03:00:00Z"),
      photos: [],
    })
    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(prismaMock))

    await createUpdate(PROJECT, {
      note: "Hạng mục: Móng\nTiến độ: 75%\nĐã đổ trục A–C",
      authorName: "Anh Nam",
      milestoneUpdate: { id: "ms-1", percent: 75, status: "IN_PROGRESS", note: "Đã đổ trục A–C" },
      photos: [],
    })

    expect(prismaMock.constructionMilestone.updateMany).toHaveBeenCalledWith({
      where: { id: "ms-1", projectId: PROJECT },
      data: { percent: 75, status: "IN_PROGRESS", note: "Đã đổ trục A–C" },
    })
    expect(prismaMock.constructionUpdate.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it("không tạo nhật ký nếu hạng mục không thuộc công trình", async () => {
    prismaMock.constructionMilestone.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.$transaction.mockImplementationOnce(async (callback) => callback(prismaMock))

    await expect(
      createUpdate(PROJECT, {
        note: "Cập nhật",
        milestoneUpdate: { id: "ms-khac", percent: 50, status: "IN_PROGRESS" },
        photos: [],
      }),
    ).rejects.toBeInstanceOf(AccessError)

    expect(prismaMock.constructionUpdate.create).not.toHaveBeenCalled()
  })
})

describe("saveCostItems", () => {
  it("từ chối id thuộc công trình khác và KHÔNG ghi gì", async () => {
    prismaMock.constructionCostItem.findMany.mockResolvedValue([])

    await expect(
      saveCostItems(PROJECT, { costItems: [cost({ id: "cost-cua-cong-trinh-khac" })] } as never),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(prismaMock.constructionCostItem.deleteMany).not.toHaveBeenCalled()
  })

  it("truy vấn kiểm tra phải lọc theo CẢ id lẫn projectId", async () => {
    prismaMock.constructionCostItem.findMany.mockResolvedValue([{ id: "c-1" }])
    await saveCostItems(PROJECT, { costItems: [cost({ id: "c-1" })] } as never)

    expect(prismaMock.constructionCostItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["c-1"] }, projectId: PROJECT } }),
    )
  })

  it("công trình không tồn tại → not_found", async () => {
    prismaMock.constructionProject.findUnique.mockResolvedValue(null)
    await expect(
      saveCostItems("prj-khong-co", { costItems: [cost()] } as never),
    ).rejects.toBeInstanceOf(AccessError)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("số tiền được lưu dạng BigInt (cột BIGINT, tránh tràn số của JS)", async () => {
    await saveCostItems(PROJECT, {
      costItems: [cost({ estimatedVnd: 2_500_000_000, actualVnd: 1_200_000_000 })],
    } as never)

    const data = prismaMock.constructionCostItem.create.mock.calls[0][0].data
    expect(data.estimatedVnd).toBe(BigInt(2_500_000_000))
    expect(data.actualVnd).toBe(BigInt(1_200_000_000))
  })
})
