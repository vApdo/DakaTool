"use client"

import { useEffect, useState } from "react"
import { Check, Cpu, Loader2, Settings2, Sparkles } from "lucide-react"
import { getSettings, updateSettings, type AiSettingsStatus } from "@/lib/auto-subtitle/client"

/**
 * Cấu hình bộ máy nhận dạng: chạy trong máy (miễn phí) hoặc dùng API OpenAI (trả phí).
 * API key nhập ở đây được lưu server-side; ô nhập không bao giờ hiển thị lại key cũ.
 */
export function AiSettings() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AiSettingsStatus | null>(null)
  const [provider, setProvider] = useState<"local" | "openai">("local")
  const [model, setModel] = useState<"whisper-1" | "gpt-4o-transcribe">("whisper-1")
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSettings()
      .then((s) => {
        setStatus(s)
        setProvider(s.provider)
        setModel(s.openaiModel)
      })
      .catch(() => undefined)
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const next = await updateSettings({
        provider,
        openaiModel: model,
        // Chỉ gửi key khi người dùng nhập mới (để trống = giữ key cũ).
        openaiApiKey: apiKey.trim() ? apiKey.trim() : undefined,
      })
      setStatus(next)
      setApiKey("")
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cấu hình.")
    } finally {
      setSaving(false)
    }
  }

  const activeLabel =
    status?.provider === "openai"
      ? `OpenAI · ${status.openaiModel}`
      : "Trong máy (faster-whisper)"

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm"
      >
        <Settings2 className="h-4 w-4 text-gray-500" />
        <span className="font-medium">Bộ máy nhận dạng</span>
        <span className="ml-auto text-xs text-gray-500">{activeLabel}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ProviderCard
              active={provider === "local"}
              onClick={() => setProvider("local")}
              icon={Cpu}
              title="Trong máy"
              desc="faster-whisper. Miễn phí, không cần mạng, hơi chậm."
            />
            <ProviderCard
              active={provider === "openai"}
              onClick={() => setProvider("openai")}
              icon={Sparkles}
              title="OpenAI API"
              desc="Nhanh, không tốn CPU. Trả phí ~$0.006/phút, cần API key."
            />
          </div>

          {provider === "openai" && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/40">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as typeof model)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="whisper-1">whisper-1 — khớp giờ tốt, khuyến nghị cho phụ đề</option>
                  <option value="gpt-4o-transcribe">gpt-4o-transcribe — chính xác hơn, khớp giờ thô hơn</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  API key OpenAI
                  {status?.openaiKeyConfigured && (
                    <span className="ml-2 text-green-600">
                      đã lưu ({status.openaiKeyHint}) — để trống nếu không đổi
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={status?.openaiKeyConfigured ? "•••• (giữ key hiện tại)" : "sk-..."}
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <p className="text-xs text-gray-400">
                  Key lưu trên máy chủ của bạn, không gửi ra trình duyệt. Lấy key tại platform.openai.com.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary justify-center px-4 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu…
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" /> Đã lưu
              </>
            ) : (
              "Lưu cấu hình"
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function ProviderCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Cpu
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${
        active
          ? "border-primary bg-[color:var(--primary-soft)]"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </span>
      <span className="text-xs text-gray-500">{desc}</span>
    </button>
  )
}
