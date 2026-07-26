/**
 * GET/PATCH /api/tools/auto-subtitle/settings
 *
 * Cấu hình provider nhận dạng (local | openai), model OpenAI, và API key.
 * GET: trả trạng thái AN TOÀN (không lộ API key, chỉ báo đã cấu hình + 4 ký tự cuối).
 * PATCH: cập nhật; bỏ trống openaiApiKey = giữ key cũ.
 * (Dùng PATCH thay PUT — Next 14.2 `next start` từng trả 405 sai cho PUT.)
 *
 * Lưu ý: chưa có hệ thống auth, nên đây là cấu hình dùng chung cho bản chạy nội bộ.
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/auto-subtitle/http"
import { updateSettingsSchema } from "@/lib/auto-subtitle/schemas"
import {
  getTranscribeSettingsStatus,
  updateTranscribeSettings,
} from "@/lib/auto-subtitle/settings"

export const runtime = "nodejs"

export async function GET() {
  try {
    return ok(await getTranscribeSettingsStatus())
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = updateSettingsSchema.parse(await request.json())
    await updateTranscribeSettings(body)
    return ok(await getTranscribeSettingsStatus())
  } catch (err) {
    return handleError(err)
  }
}
