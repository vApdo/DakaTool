import { z } from "zod"

const limitedText = (max: number) => z.string().trim().max(max)

export const paymentRequestItemSchema = z.object({
  id: z.string().min(1).max(100),
  name: limitedText(300).min(1, "Tên hàng hóa hoặc dịch vụ không được để trống."),
  unit: limitedText(50),
  quantity: z.number().finite().min(0).max(1_000_000_000),
  unitPrice: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  note: limitedText(500),
})

export const paymentRequestDataSchema = z.object({
  companyName: limitedText(300).min(1),
  companyAddress: limitedText(500).min(1),
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày đề nghị không hợp lệ."),
  recipient: limitedText(400).min(1),
  requesterName: limitedText(200).min(1),
  department: limitedText(200).min(1),
  paymentContent: limitedText(1500),
  items: z.array(paymentRequestItemSchema).min(1).max(8),
})

export const createPaymentHistorySchema = z.object({
  action: z.enum(["download", "print"]),
  data: paymentRequestDataSchema,
})
