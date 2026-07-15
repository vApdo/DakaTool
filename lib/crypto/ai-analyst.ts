import type { CoinRow, DailyCandle } from "./market-data"
import { dailyVolatility, maxDrawdown, pctChange, rsi, sma } from "./indicators"

/**
 * "Chuyên viên phân tích AI" — mô phỏng thu nhỏ vòng làm việc của Vibe-Trading:
 * Plan (câu hỏi) → Ground (dữ liệu giá thật + chỉ báo) → Execute (gọi LLM) → Deliver (báo cáo).
 * Nguyên tắc grounding: chỉ đưa cho model dữ liệu đã lấy được, và yêu cầu nó
 * không bịa số liệu ngoài phần được cung cấp.
 */

export type AiProvider = "anthropic" | "openai"

export interface AiSettings {
  provider: AiProvider
  apiKey: string
  model: string
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o-mini",
}

const SYSTEM_PROMPT = `Bạn là chuyên viên phân tích thị trường crypto cho người dùng Việt Nam.
Nguyên tắc bắt buộc:
- CHỈ dùng số liệu trong khối DỮ LIỆU được cung cấp. Không bịa thêm giá, khối lượng hay tin tức. Nếu thiếu dữ liệu để trả lời, nói rõ là thiếu.
- Đây là nghiên cứu tham khảo, KHÔNG phải lời khuyên đầu tư. Không hứa hẹn lợi nhuận, luôn nêu rủi ro.
- Trả lời bằng tiếng Việt, trình bày theo cấu trúc:
  1. Tóm tắt (2-3 câu trả lời thẳng câu hỏi)
  2. Phân tích kỹ thuật (dựa trên giá, xu hướng, RSI, SMA, biến động trong dữ liệu)
  3. Rủi ro cần lưu ý
  4. Kịch bản có thể xảy ra (tăng/giảm/đi ngang, kèm điều kiện)
  5. Kết luận
- Viết gọn, dùng số liệu cụ thể từ dữ liệu, kết thúc bằng dòng: "⚠️ Nghiên cứu tham khảo, không phải khuyến nghị đầu tư."`

function fmt(n: number | null, digits = 2): string {
  return n === null ? "n/a" : n.toFixed(digits)
}

/** Dựng khối dữ liệu grounding từ giá thật — phần "Ground" của quy trình. */
export function buildAnalysisPrompt(
  coin: CoinRow,
  candles: DailyCandle[],
  source: string,
  question: string,
): string {
  const closes = candles.map((c) => c.close)
  const recent = candles.slice(-30)
  const lines = recent.map(
    (c) =>
      `${new Date(c.time).toISOString().slice(0, 10)}: open ${c.open}, high ${c.high}, low ${c.low}, close ${c.close}, volume ${Math.round(c.volume)}`,
  )

  return `DỮ LIỆU (nguồn: ${source}, cập nhật lúc ${new Date().toISOString()}):
Coin: ${coin.name} (${coin.symbol})
Giá hiện tại: $${coin.priceUsd}
Thay đổi 24h: ${fmt(coin.change24hPct)}% · 7 ngày: ${fmt(coin.change7dPct)}%
Vốn hóa: $${Math.round(coin.marketCapUsd).toLocaleString("en-US")} · Khối lượng 24h: $${Math.round(coin.volume24hUsd).toLocaleString("en-US")}

Chỉ báo tính từ ${candles.length} nến ngày gần nhất:
- SMA20: ${fmt(sma(closes, 20), 4)} · SMA50: ${fmt(sma(closes, 50), 4)}
- RSI14: ${fmt(rsi(closes, 14), 1)}
- Biến động ngày (30 kỳ): ${fmt(dailyVolatility(closes, 30))}%/ngày
- Sụt giảm tối đa từ đỉnh (${candles.length} ngày): ${fmt(maxDrawdown(closes))}%
- Thay đổi 30 ngày: ${fmt(pctChange(closes, 30))}% · 90 ngày: ${fmt(pctChange(closes, Math.min(89, closes.length - 1)))}%

30 nến ngày gần nhất:
${lines.join("\n")}

CÂU HỎI CỦA NGƯỜI DÙNG: ${question}`
}

/** Gọi LLM bằng API key của người dùng, thẳng từ trình duyệt — không qua server DakaTool. */
export async function runAnalysis(settings: AiSettings, prompt: string): Promise<string> {
  if (settings.provider === "anthropic") {
    // Gọi REST trực tiếp từ trình duyệt (SDK Node không bundle được vào client).
    // Header anthropic-dangerous-direct-browser-access là cách opt-in CORS chính thức —
    // chấp nhận được vì key là CỦA NGƯỜI DÙNG và chỉ nằm trên máy họ.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (res.status === 401) throw new Error("API key không hợp lệ hoặc đã bị thu hồi.")
    if (res.status === 404) throw new Error(`Không tìm thấy model "${settings.model}". Kiểm tra lại tên model.`)
    if (res.status === 429) throw new Error("API đang giới hạn tần suất hoặc hết hạn mức. Thử lại sau.")
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      throw new Error(body?.error?.message ?? `API Anthropic trả về lỗi ${res.status}.`)
    }
    const data = (await res.json()) as {
      stop_reason?: string
      content?: { type: string; text?: string }[]
    }
    if (data.stop_reason === "refusal") {
      throw new Error("Model từ chối yêu cầu này. Hãy điều chỉnh câu hỏi và thử lại.")
    }
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
    if (!text) throw new Error("Model không trả về nội dung nào.")
    return text
  }

  // OpenAI-compatible qua HTTP thuần (không kéo SDK OpenAI vào bundle).
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  })
  if (res.status === 401) throw new Error("API key không hợp lệ hoặc đã bị thu hồi.")
  if (res.status === 429) throw new Error("API đang giới hạn tần suất hoặc hết hạn mức. Thử lại sau.")
  if (!res.ok) throw new Error(`API AI trả về lỗi ${res.status}.`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("Model không trả về nội dung nào.")
  return text
}

export interface ServerAiStatus {
  configured: boolean
  provider?: AiProvider
  model?: string
}

/** Hỏi server xem admin đã cấu hình AI chung chưa (không nhận key, chỉ trạng thái). */
export async function fetchServerAiStatus(): Promise<ServerAiStatus> {
  try {
    const res = await fetch("/api/ai/config")
    if (!res.ok) return { configured: false }
    return (await res.json()) as ServerAiStatus
  } catch {
    return { configured: false }
  }
}

/** Chạy phân tích qua server (key của tổ chức, admin cấu hình) — người dùng không cần key. */
export async function runAnalysisViaServer(prompt: string): Promise<string> {
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
  const data = (await res.json().catch(() => null)) as { text?: string; error?: string } | null
  if (!res.ok) throw new Error(data?.error ?? `Server trả về lỗi ${res.status}.`)
  if (!data?.text) throw new Error("Server không trả về nội dung nào.")
  return data.text
}

/** Đổi lỗi API AI thành thông báo tiếng Việt dễ hiểu. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (/401|authentication/i.test(err.message)) return "API key không hợp lệ hoặc đã bị thu hồi."
    if (/429|rate.?limit/i.test(err.message)) return "API đang giới hạn tần suất hoặc hết hạn mức. Thử lại sau ít phút."
    if (/CORS|Failed to fetch|NetworkError/i.test(err.message)) {
      return "Không gọi được API AI từ trình duyệt (mạng hoặc CORS). Kiểm tra kết nối rồi thử lại."
    }
    if (err.message) return err.message
  }
  return "Có lỗi không xác định khi gọi AI. Thử lại sau."
}
