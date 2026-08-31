import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPaymentHistory, getPaymentHistory, listPaymentHistory } from "@/lib/payment-history/repository"
import { createPaymentHistorySchema } from "@/lib/payment-history/schemas"
import type { PaymentRequestData } from "@/lib/payment-request"

const prismaMock = vi.hoisted(() => ({
  paymentRequestHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const sampleData: PaymentRequestData = {
  companyName: "CÔNG TY TNHH NQY SERVICE",
  companyAddress: "Asia Group Building 3F, Lô 787 KĐT Nam Vĩnh Yên, P. Vĩnh Phúc, T. Phú Thọ",
  requestDate: "2026-08-31",
  recipient: "Ban lãnh đạo CÔNG TY TNHH NQY SERVICE",
  requesterName: "Nguyễn Đăng Vít",
  department: "HCNS",
  paymentContent: "Thanh toán văn phòng phẩm",
  items: [
    {
      id: "item-1",
      name: "Giấy in A4",
      unit: "thùng",
      quantity: 2,
      unitPrice: 125_000,
      note: "",
    },
  ],
}

const dbRecord = {
  id: "history-1",
  action: "DOWNLOAD" as const,
  requestDate: sampleData.requestDate,
  requesterName: sampleData.requesterName,
  department: sampleData.department,
  companyName: sampleData.companyName,
  totalVnd: BigInt(250_000),
  snapshot: sampleData,
  createdAt: new Date("2026-08-31T02:00:00.000Z"),
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.paymentRequestHistory.create.mockResolvedValue(dbRecord)
  prismaMock.paymentRequestHistory.findMany.mockResolvedValueOnce([])
})

describe("payment history validation", () => {
  it("chấp nhận snapshot phiếu đầy đủ", () => {
    expect(createPaymentHistorySchema.parse({ action: "download", data: sampleData })).toEqual({
      action: "download",
      data: sampleData,
    })
  })

  it("từ chối tên hàng trống và quá 8 dòng", () => {
    const blankName = {
      ...sampleData,
      items: [{ ...sampleData.items[0], name: "" }],
    }
    expect(() => createPaymentHistorySchema.parse({ action: "download", data: blankName })).toThrow()

    const tooMany = {
      ...sampleData,
      items: Array.from({ length: 9 }, (_, index) => ({ ...sampleData.items[0], id: `item-${index}` })),
    }
    expect(() => createPaymentHistorySchema.parse({ action: "print", data: tooMany })).toThrow()
  })
})

describe("payment history repository", () => {
  it("tự tính tổng tiền ở server và lưu snapshot", async () => {
    const result = await createPaymentHistory({ action: "download", data: sampleData })

    expect(prismaMock.paymentRequestHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DOWNLOAD",
        totalVnd: BigInt(250_000),
        snapshot: sampleData,
      }),
    })
    expect(result).toMatchObject({
      id: "history-1",
      action: "download",
      totalVnd: 250_000,
      data: sampleData,
    })
  })

  it("xóa bản ghi vượt quá giới hạn 100", async () => {
    prismaMock.paymentRequestHistory.findMany.mockReset()
    prismaMock.paymentRequestHistory.findMany.mockResolvedValue([{ id: "old-101" }, { id: "old-102" }])

    await createPaymentHistory({ action: "download", data: sampleData })

    expect(prismaMock.paymentRequestHistory.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      skip: 100,
      select: { id: true },
    })
    expect(prismaMock.paymentRequestHistory.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-101", "old-102"] } },
    })
  })

  it("trả danh sách tóm tắt mới nhất", async () => {
    prismaMock.paymentRequestHistory.findMany.mockReset()
    prismaMock.paymentRequestHistory.findMany.mockResolvedValue([dbRecord])
    await expect(listPaymentHistory()).resolves.toEqual([
      {
        id: "history-1",
        action: "download",
        requestDate: "2026-08-31",
        requesterName: "Nguyễn Đăng Vít",
        department: "HCNS",
        companyName: "CÔNG TY TNHH NQY SERVICE",
        totalVnd: 250_000,
        createdAt: "2026-08-31T02:00:00.000Z",
      },
    ])
  })

  it("trả snapshot đầy đủ khi xem lại", async () => {
    prismaMock.paymentRequestHistory.findUnique.mockResolvedValue(dbRecord)
    await expect(getPaymentHistory("history-1")).resolves.toMatchObject({ data: sampleData })
  })
})
