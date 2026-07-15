import { describe, expect, it } from "vitest"
import { dailyVolatility, maxDrawdown, pctChange, rsi, sma } from "@/lib/crypto/indicators"
import { buildAnalysisPrompt } from "@/lib/crypto/ai-analyst"
import type { CoinRow, DailyCandle } from "@/lib/crypto/market-data"

describe("chỉ báo kỹ thuật", () => {
  it("sma tính trung bình n phần tử cuối, trả null khi thiếu dữ liệu", () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5)
    expect(sma([1, 2], 5)).toBeNull()
  })

  it("rsi = 100 khi chỉ tăng, ~0 khi chỉ giảm, null khi thiếu kỳ", () => {
    const up = Array.from({ length: 20 }, (_, i) => 100 + i)
    const down = Array.from({ length: 20 }, (_, i) => 100 - i)
    expect(rsi(up, 14)).toBe(100)
    expect(rsi(down, 14)).toBeLessThan(1)
    expect(rsi([1, 2, 3], 14)).toBeNull()
  })

  it("maxDrawdown bắt đúng mức giảm sâu nhất từ đỉnh", () => {
    // đỉnh 200 → đáy 100 = -50%
    expect(maxDrawdown([100, 200, 150, 100, 180])).toBeCloseTo(-50)
    expect(maxDrawdown([5])).toBeNull()
  })

  it("pctChange so với n kỳ trước", () => {
    expect(pctChange([100, 110, 120], 2)).toBeCloseTo(20)
    expect(pctChange([100], 5)).toBeNull()
  })

  it("dailyVolatility = 0 khi giá phẳng", () => {
    expect(dailyVolatility(Array(40).fill(50), 30)).toBeCloseTo(0)
  })
})

describe("buildAnalysisPrompt (grounding)", () => {
  const coin: CoinRow = {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "",
    priceUsd: 65000,
    change24hPct: 1.5,
    change7dPct: -3.2,
    marketCapUsd: 1.2e12,
    volume24hUsd: 3e10,
    sparkline7d: [],
  }
  const candles: DailyCandle[] = Array.from({ length: 60 }, (_, i) => ({
    time: Date.UTC(2026, 4, 1) + i * 86400000,
    open: 60000 + i * 10,
    high: 60100 + i * 10,
    low: 59900 + i * 10,
    close: 60000 + i * 10,
    volume: 1000,
  }))

  it("chứa số liệu thật, chỉ báo và câu hỏi; giới hạn 30 nến gần nhất", () => {
    const prompt = buildAnalysisPrompt(coin, candles, "binance", "Xu hướng thế nào?")
    expect(prompt).toContain("Bitcoin (BTC)")
    expect(prompt).toContain("$65000")
    expect(prompt).toContain("SMA20")
    expect(prompt).toContain("RSI14")
    expect(prompt).toContain("Xu hướng thế nào?")
    // 30 dòng nến, không lộ toàn bộ 60
    const candleLines = prompt.split("\n").filter((l) => /^\d{4}-\d{2}-\d{2}:/.test(l))
    expect(candleLines).toHaveLength(30)
  })
})
