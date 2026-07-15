import { NextResponse, type NextRequest } from "next/server"
import { getServerAiConfig } from "@/lib/crypto/server-ai-config"
import { runAnalysis } from "@/lib/crypto/ai-analyst"

/**
 * Proxy phân tích AI: key của tổ chức nằm ở biến môi trường server,
 * người dùng gửi prompt đã grounding lên đây — không bao giờ thấy key.
 * Có giới hạn tần suất theo IP để hạn chế lạm dụng hạn mức.
 */

const MAX_PROMPT_CHARS = 20_000
const RATE_LIMIT = 10 // lượt
const RATE_WINDOW_MS = 10 * 60 * 1000 // mỗi 10 phút

// Bộ đếm trong bộ nhớ của serverless instance — đủ để chặn lạm dụng thô,
// không phải rate limit tuyệt đối (mỗi instance đếm riêng).
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export async function POST(request: NextRequest) {
  const config = getServerAiConfig()
  if (!config) {
    return NextResponse.json(
      { error: "Admin chưa cấu hình AI cho hệ thống (biến môi trường AI_API_KEY)." },
      { status: 503 },
    )
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: `Bạn đã dùng quá ${RATE_LIMIT} lượt phân tích trong 10 phút. Đợi một lát rồi thử lại.` },
      { status: 429 },
    )
  }

  let prompt: unknown
  try {
    prompt = ((await request.json()) as { prompt?: unknown }).prompt
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 })
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Thiếu prompt." }, { status: 400 })
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: "Prompt quá dài." }, { status: 400 })
  }

  try {
    const text = await runAnalysis(
      { provider: config.provider, apiKey: config.apiKey, model: config.model },
      prompt,
    )
    return NextResponse.json({ text, provider: config.provider, model: config.model })
  } catch (err) {
    console.error("Server AI analyze error:", err)
    const message = err instanceof Error ? err.message : "Lỗi không xác định khi gọi AI."
    // Không lộ chi tiết key/cấu hình — message từ lớp AI đã được chuẩn hóa tiếng Việt.
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
