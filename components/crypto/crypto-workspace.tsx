"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, KeyRound, Loader2, RefreshCw, ScanSearch } from "lucide-react"
import type { AiProvider, AiSettings } from "@/lib/crypto/ai-analyst"
import { DEFAULT_MODELS, aiErrorMessage, buildAnalysisPrompt, runAnalysis } from "@/lib/crypto/ai-analyst"
import type { CandleResult, CoinRow } from "@/lib/crypto/market-data"
import { fetchDailyCandles, fetchTopCoins } from "@/lib/crypto/market-data"
import { dailyVolatility, maxDrawdown, rsi, sma } from "@/lib/crypto/indicators"
import { recordRun } from "@/lib/run-history"
import { RunStatusLine, type SimpleRunState } from "@/components/pdf/run-status"
import { PriceChart, Sparkline } from "./sparkline"

const SETTINGS_KEY = "dakatool.crypto.ai-settings.v1"

const PRESET_QUESTIONS = [
  "Xu hướng ngắn hạn của coin này thế nào? Vùng giá nào đáng chú ý?",
  "Đánh giá rủi ro nếu mua và nắm giữ coin này 1 tháng.",
  "Coin đang quá mua hay quá bán? Kịch bản nào dễ xảy ra tuần tới?",
]

const DEFAULT_SETTINGS: AiSettings = { provider: "anthropic", apiKey: "", model: DEFAULT_MODELS.anthropic }

function loadSettings(): AiSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AiSettings>) }
  } catch {
    // hỏng thì dùng mặc định
  }
  return DEFAULT_SETTINGS
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

function fmtPct(n: number | null): string {
  return n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
}

function PctCell({ value }: { value: number | null }) {
  const color =
    value === null
      ? "text-gray-500"
      : value >= 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400"
  return <span className={`whitespace-nowrap font-medium ${color}`}>{fmtPct(value)}</span>
}

export function CryptoWorkspace() {
  const [coins, setCoins] = useState<CoinRow[]>([])
  const [marketState, setMarketState] = useState<SimpleRunState>({ step: "idle" })
  const [selected, setSelected] = useState<CoinRow | null>(null)
  const [candleResult, setCandleResult] = useState<CandleResult | null>(null)
  const [candleState, setCandleState] = useState<SimpleRunState>({ step: "idle" })

  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Đọc cài đặt đã lưu sau khi mount để HTML server và client khớp nhau (tránh lỗi hydration).
  useEffect(() => {
    setSettings(loadSettings())
    setSettingsLoaded(true)
  }, [])
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0])
  const [report, setReport] = useState<string | null>(null)
  const [aiState, setAiState] = useState<SimpleRunState>({ step: "idle" })

  useEffect(() => {
    if (!settingsLoaded) return
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // localStorage bị chặn — bỏ qua
    }
  }, [settings, settingsLoaded])

  async function loadMarket() {
    setMarketState({ step: "working", message: "Đang tải bảng giá..." })
    try {
      const rows = await fetchTopCoins(20)
      setCoins(rows)
      setMarketState({ step: "idle" })
    } catch (err) {
      console.error("Crypto market error:", err)
      setMarketState({
        step: "error",
        message: err instanceof Error ? err.message : "Không tải được dữ liệu thị trường.",
      })
    }
  }

  useEffect(() => {
    void loadMarket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelect(coin: CoinRow) {
    setSelected(coin)
    setReport(null)
    setAiState({ step: "idle" })
    setCandleResult(null)
    setCandleState({ step: "working", message: `Đang tải nến ngày của ${coin.symbol}...` })
    try {
      const result = await fetchDailyCandles(coin)
      setCandleResult(result)
      setCandleState({ step: "idle" })
    } catch (err) {
      console.error("Crypto candles error:", err)
      setCandleState({
        step: "error",
        message: err instanceof Error ? err.message : "Không tải được dữ liệu giá của coin này.",
      })
    }
  }

  const indicators = useMemo(() => {
    if (!candleResult) return null
    const closes = candleResult.candles.map((c) => c.close)
    return {
      closes,
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      rsi14: rsi(closes, 14),
      vol30: dailyVolatility(closes, 30),
      drawdown: maxDrawdown(closes),
    }
  }, [candleResult])

  async function handleAnalyze() {
    if (!selected || !candleResult || !settings.apiKey.trim() || !question.trim()) return
    setAiState({ step: "working", message: "AI đang phân tích trên dữ liệu giá thật..." })
    setReport(null)
    const startedAt = Date.now()
    try {
      const prompt = buildAnalysisPrompt(selected, candleResult.candles, candleResult.source, question.trim())
      const text = await runAnalysis(settings, prompt)
      setReport(text)
      setAiState({ step: "done", message: "Đã có báo cáo phân tích." })
      recordRun({
        toolId: "crypto-research",
        toolName: "Nghiên cứu thị trường Crypto",
        status: "success",
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        summary: `Phân tích ${selected.symbol}: ${question.trim().slice(0, 80)}`,
      })
    } catch (err) {
      console.error("Crypto AI error:", err)
      const message = aiErrorMessage(err)
      setAiState({ step: "error", message })
      recordRun({
        toolId: "crypto-research",
        toolName: "Nghiên cứu thị trường Crypto",
        status: "failed",
        durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        summary: `Phân tích ${selected.symbol} thất bại: ${message}`,
      })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      {/* Bảng thị trường */}
      <section className="card p-6 xl:col-span-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Top 20 theo vốn hóa</h2>
          <button type="button" onClick={loadMarket} className="btn-secondary text-sm" disabled={marketState.step === "working"}>
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
        </div>
        <RunStatusLine state={marketState} />
        {coins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--card-border)] text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th scope="col" className="py-3 pr-3 font-medium">Coin</th>
                  <th scope="col" className="py-3 pr-3 font-medium">Giá</th>
                  <th scope="col" className="py-3 pr-3 font-medium">24h</th>
                  <th scope="col" className="py-3 pr-3 font-medium">7 ngày</th>
                  <th scope="col" className="py-3 pr-3 font-medium">Khối lượng 24h</th>
                  <th scope="col" className="py-3 font-medium">7 ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--card-border)]">
                {coins.map((coin) => (
                  <tr
                    key={coin.id}
                    onClick={() => handleSelect(coin)}
                    className={`cursor-pointer transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
                      selected?.id === coin.id ? "bg-[color:var(--primary-soft)]" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coin.image} alt="" className="h-5 w-5 rounded-full" />
                        <span className="font-medium text-black dark:text-white">{coin.symbol}</span>
                        <span className="hidden text-xs text-gray-500 sm:inline">{coin.name}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-black dark:text-white">
                      ${coin.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-2.5 pr-3"><PctCell value={coin.change24hPct} /></td>
                    <td className="py-2.5 pr-3"><PctCell value={coin.change7dPct} /></td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-gray-600 dark:text-gray-400">{fmtUsd(coin.volume24hUsd)}</td>
                    <td className="py-2.5"><Sparkline values={coin.sparkline7d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Dữ liệu: CoinGecko + Binance (public API), tải thẳng về trình duyệt của bạn. Bấm vào một coin để phân tích.
        </p>
      </section>

      {/* Panel phân tích */}
      <section className="space-y-6 xl:col-span-2">
        <div className="card p-6">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">
            {selected ? `${selected.name} (${selected.symbol})` : "Chọn một coin để bắt đầu"}
          </h2>
          <RunStatusLine state={candleState} />
          {selected && indicators && candleResult && (
            <>
              <PriceChart values={indicators.closes} />
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-gray-500">RSI 14</dt><dd className="font-medium text-black dark:text-white">{indicators.rsi14?.toFixed(1) ?? "—"}</dd></div>
                <div><dt className="text-xs text-gray-500">SMA 20</dt><dd className="font-medium text-black dark:text-white">{indicators.sma20 ? `$${indicators.sma20.toLocaleString("en-US", { maximumFractionDigits: 4 })}` : "—"}</dd></div>
                <div><dt className="text-xs text-gray-500">SMA 50</dt><dd className="font-medium text-black dark:text-white">{indicators.sma50 ? `$${indicators.sma50.toLocaleString("en-US", { maximumFractionDigits: 4 })}` : "—"}</dd></div>
                <div><dt className="text-xs text-gray-500">Biến động/ngày</dt><dd className="font-medium text-black dark:text-white">{indicators.vol30 ? `${indicators.vol30.toFixed(2)}%` : "—"}</dd></div>
                <div><dt className="text-xs text-gray-500">Drawdown 90d</dt><dd className="font-medium text-black dark:text-white">{indicators.drawdown ? `${indicators.drawdown.toFixed(1)}%` : "—"}</dd></div>
                <div><dt className="text-xs text-gray-500">Nguồn nến</dt><dd className="font-medium capitalize text-black dark:text-white">{candleResult.source}</dd></div>
              </dl>
            </>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
            <Bot className="h-5 w-5 text-primary" />
            Hỏi AI trên dữ liệu thật
          </h2>

          <div className="mb-4 space-y-3 rounded-xl border border-[color:var(--card-border)] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <KeyRound className="h-3.5 w-3.5" />
              API key của bạn — lưu trên trình duyệt này, gọi thẳng tới nhà cung cấp AI, không qua server DakaTool.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ai-provider" className="field-label text-xs">Nhà cung cấp</label>
                <select
                  id="ai-provider"
                  value={settings.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AiProvider
                    setSettings((s) => ({ ...s, provider, model: DEFAULT_MODELS[provider] }))
                  }}
                  className="field-input"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                </select>
              </div>
              <div>
                <label htmlFor="ai-model" className="field-label text-xs">Model</label>
                <input
                  id="ai-model"
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                  className="field-input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ai-key" className="field-label text-xs">API key</label>
              <div className="flex gap-2">
                <input
                  id="ai-key"
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                  placeholder={settings.provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                  className="field-input"
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)} className="btn-secondary text-xs">
                  {showKey ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>
          </div>

          <label htmlFor="ai-question" className="field-label">Câu hỏi nghiên cứu</label>
          <textarea
            id="ai-question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="field-input resize-y"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full bg-black/5 px-3 py-1 text-xs text-gray-700 hover:bg-[color:var(--primary-soft)] hover:text-primary dark:bg-white/10 dark:text-gray-300"
              >
                {q.slice(0, 42)}...
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selected || !candleResult || !settings.apiKey.trim() || !question.trim() || aiState.step === "working"}
            className="btn-primary mt-4"
          >
            {aiState.step === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Phân tích {selected ? selected.symbol : ""}
          </button>
          {!selected && <p className="mt-2 text-xs text-gray-500">Chọn một coin ở bảng bên trái trước.</p>}
          {selected && !settings.apiKey.trim() && (
            <p className="mt-2 text-xs text-gray-500">Nhập API key của bạn để chạy phân tích.</p>
          )}
          <div className="mt-3">
            <RunStatusLine state={aiState} />
          </div>

          {report && (
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[color:var(--card-border)] bg-black/[0.02] p-4 text-sm leading-relaxed text-gray-800 dark:bg-white/[0.03] dark:text-gray-200">
              {report}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
