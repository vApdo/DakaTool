import { NextResponse } from "next/server"
import { getServerAiConfig } from "@/lib/crypto/server-ai-config"

// Đọc biến môi trường lúc chạy — không để Next đóng băng kết quả lúc build.
export const dynamic = "force-dynamic"

/** Cho client biết admin đã cấu hình AI chưa (không bao giờ trả về key). */
export async function GET() {
  const config = getServerAiConfig()
  if (!config) return NextResponse.json({ configured: false })
  return NextResponse.json({ configured: true, provider: config.provider, model: config.model })
}
