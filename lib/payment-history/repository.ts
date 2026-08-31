import { Prisma, type PaymentRequestAction, type PaymentRequestHistory } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { calculatePaymentTotal } from "@/lib/payment-request"
import { paymentRequestDataSchema } from "./schemas"
import type {
  CreatePaymentHistoryInput,
  PaymentHistoryAction,
  PaymentHistoryRecord,
  PaymentHistorySummary,
} from "./types"

const MAX_HISTORY_RECORDS = 100

function toDbAction(action: PaymentHistoryAction): PaymentRequestAction {
  return action === "download" ? "DOWNLOAD" : "PRINT"
}

function fromDbAction(action: PaymentRequestAction): PaymentHistoryAction {
  return action === "DOWNLOAD" ? "download" : "print"
}

function toSummary(row: PaymentRequestHistory): PaymentHistorySummary {
  return {
    id: row.id,
    action: fromDbAction(row.action),
    requestDate: row.requestDate,
    requesterName: row.requesterName,
    department: row.department,
    companyName: row.companyName,
    totalVnd: Number(row.totalVnd),
    createdAt: row.createdAt.toISOString(),
  }
}

function toRecord(row: PaymentRequestHistory): PaymentHistoryRecord {
  return {
    ...toSummary(row),
    data: paymentRequestDataSchema.parse(row.snapshot),
  }
}

export async function createPaymentHistory(input: CreatePaymentHistoryInput): Promise<PaymentHistoryRecord> {
  const data = paymentRequestDataSchema.parse(input.data)
  const total = Math.round(calculatePaymentTotal(data.items))
  if (!Number.isSafeInteger(total)) throw new Error("Tổng tiền vượt quá giới hạn lưu trữ an toàn.")

  const created = await prisma.paymentRequestHistory.create({
    data: {
      action: toDbAction(input.action),
      requestDate: data.requestDate,
      requesterName: data.requesterName,
      department: data.department,
      companyName: data.companyName,
      totalVnd: BigInt(total),
      snapshot: data as unknown as Prisma.InputJsonValue,
    },
  })

  const stale = await prisma.paymentRequestHistory.findMany({
    orderBy: { createdAt: "desc" },
    skip: MAX_HISTORY_RECORDS,
    select: { id: true },
  })
  if (stale.length) {
    await prisma.paymentRequestHistory.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
  }

  return toRecord(created)
}

export async function listPaymentHistory(): Promise<PaymentHistorySummary[]> {
  const rows = await prisma.paymentRequestHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY_RECORDS,
  })
  return rows.map(toSummary)
}

export async function getPaymentHistory(id: string): Promise<PaymentHistoryRecord | null> {
  const row = await prisma.paymentRequestHistory.findUnique({ where: { id } })
  return row ? toRecord(row) : null
}

export async function deletePaymentHistory(id: string): Promise<boolean> {
  const result = await prisma.paymentRequestHistory.deleteMany({ where: { id } })
  return result.count > 0
}
