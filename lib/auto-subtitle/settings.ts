/**
 * Cấu hình nhận dạng giọng nói (provider + model + API key), lưu trong bảng AppSetting.
 *
 * - `local`   : dùng faster-whisper chạy trong máy (miễn phí).
 * - `openai`  : gọi API OpenAI (whisper-1 hoặc gpt-4o-transcribe) — cần API key, trả phí.
 *
 * API key CHỈ đọc phía server (worker). Không bao giờ trả nguyên văn về client — API
 * status chỉ cho biết đã cấu hình hay chưa + 4 ký tự cuối để đối chiếu.
 */
import { prisma } from "@/lib/prisma"

export type TranscribeProvider = "local" | "openai"
export const OPENAI_MODELS = ["whisper-1", "gpt-4o-transcribe"] as const
export type OpenAIModel = (typeof OPENAI_MODELS)[number]

const KEYS = {
  provider: "transcribe.provider",
  openaiModel: "transcribe.openaiModel",
  openaiApiKey: "transcribe.openaiApiKey",
} as const

export interface TranscribeSettings {
  provider: TranscribeProvider
  openaiModel: OpenAIModel
  /** Có mặt khi đọc phía worker; API public không trả trường này. */
  openaiApiKey?: string
}

export interface TranscribeSettingsStatus {
  provider: TranscribeProvider
  openaiModel: OpenAIModel
  openaiKeyConfigured: boolean
  openaiKeyHint: string | null
}

async function readAll(): Promise<Record<string, string>> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  })
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

function normProvider(v: string | undefined): TranscribeProvider {
  return v === "openai" ? "openai" : "local"
}
function normModel(v: string | undefined): OpenAIModel {
  return (OPENAI_MODELS as readonly string[]).includes(v ?? "")
    ? (v as OpenAIModel)
    : "whisper-1"
}

/** Đọc đầy đủ (gồm API key) — CHỈ dùng ở worker/server nội bộ. */
export async function getTranscribeSettings(): Promise<TranscribeSettings> {
  const all = await readAll()
  return {
    provider: normProvider(all[KEYS.provider]),
    openaiModel: normModel(all[KEYS.openaiModel]),
    openaiApiKey: all[KEYS.openaiApiKey] || undefined,
  }
}

/** Trạng thái an toàn để trả về client (không lộ API key). */
export async function getTranscribeSettingsStatus(): Promise<TranscribeSettingsStatus> {
  const s = await getTranscribeSettings()
  const key = s.openaiApiKey
  return {
    provider: s.provider,
    openaiModel: s.openaiModel,
    openaiKeyConfigured: Boolean(key),
    openaiKeyHint: key ? `••••${key.slice(-4)}` : null,
  }
}

async function put(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

/**
 * Cập nhật cấu hình. `openaiApiKey`:
 *  - undefined → giữ nguyên key cũ,
 *  - chuỗi rỗng → xoá key,
 *  - chuỗi khác → đặt key mới.
 */
export async function updateTranscribeSettings(input: {
  provider: TranscribeProvider
  openaiModel: OpenAIModel
  openaiApiKey?: string
}): Promise<void> {
  await put(KEYS.provider, input.provider)
  await put(KEYS.openaiModel, input.openaiModel)
  if (input.openaiApiKey !== undefined) {
    if (input.openaiApiKey.trim() === "") {
      await prisma.appSetting.deleteMany({ where: { key: KEYS.openaiApiKey } })
    } else {
      await put(KEYS.openaiApiKey, input.openaiApiKey.trim())
    }
  }
}
