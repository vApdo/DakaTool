import type { PaymentRequestData } from "@/lib/payment-request"

export type PaymentHistoryAction = "download" | "print"

export interface PaymentHistorySummary {
  id: string
  action: PaymentHistoryAction
  requestDate: string
  requesterName: string
  department: string
  companyName: string
  totalVnd: number
  createdAt: string
}

export interface PaymentHistoryRecord extends PaymentHistorySummary {
  data: PaymentRequestData
}

export interface CreatePaymentHistoryInput {
  action: PaymentHistoryAction
  data: PaymentRequestData
}
