/**
 * Cấu hình AI do ADMIN đặt qua biến môi trường trên Vercel
 * (Project → Settings → Environment Variables):
 *   AI_PROVIDER = anthropic | openai
 *   AI_API_KEY  = key của tổ chức (không bao giờ gửi xuống trình duyệt)
 *   AI_MODEL    = vd claude-opus-4-8, gpt-4o-mini (bỏ trống = mặc định theo provider)
 * Người dùng cuối chỉ việc dùng — không cần nhập key.
 */

export interface ServerAiConfig {
  provider: "anthropic" | "openai"
  apiKey: string
  model: string
}

const DEFAULT_MODEL: Record<ServerAiConfig["provider"], string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o-mini",
}

export function getServerAiConfig(): ServerAiConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim()
  if (!apiKey) return null
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() === "openai" ? "openai" : "anthropic"
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL[provider]
  return { provider, apiKey, model }
}
