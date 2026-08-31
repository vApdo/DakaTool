import type {
  CreatePaymentHistoryInput,
  PaymentHistoryRecord,
  PaymentHistorySummary,
} from "./types"

type ErrorPayload = { error?: { message?: string } }

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  })
  const payload = (await response.json().catch(() => ({}))) as T & ErrorPayload
  if (!response.ok) throw new Error(payload.error?.message ?? "Không thể xử lý lịch sử phiếu.")
  return payload
}

export async function createPaymentHistoryRecord(
  input: CreatePaymentHistoryInput,
): Promise<PaymentHistoryRecord> {
  return apiRequest<PaymentHistoryRecord>("/api/payment-requests", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function listPaymentHistoryRecords(): Promise<PaymentHistorySummary[]> {
  const result = await apiRequest<{ records: PaymentHistorySummary[] }>("/api/payment-requests", {
    cache: "no-store",
  })
  return result.records
}

export async function getPaymentHistoryRecord(id: string): Promise<PaymentHistoryRecord> {
  return apiRequest<PaymentHistoryRecord>(`/api/payment-requests/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
}

export async function deletePaymentHistoryRecord(id: string): Promise<void> {
  await apiRequest<{ deleted: true }>(`/api/payment-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
