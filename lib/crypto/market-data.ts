/**
 * Lớp dữ liệu thị trường crypto — học theo kiến trúc "fallback chain" của
 * Vibe-Trading (mỗi loại dữ liệu có nguồn ưu tiên và nguồn dự phòng):
 *   - Danh sách coin:  CoinGecko (miễn phí, có sparkline 7 ngày)
 *   - Nến ngày:        Binance (OHLCV đầy đủ) → fallback CoinGecko (chỉ giá đóng)
 * Gọi thẳng từ trình duyệt (cả hai API đều mở CORS), không qua server nào của DakaTool.
 */

export interface CoinRow {
  id: string
  symbol: string
  name: string
  image: string
  priceUsd: number
  change24hPct: number | null
  change7dPct: number | null
  marketCapUsd: number
  volume24hUsd: number
  sparkline7d: number[]
}

export interface DailyCandle {
  /** Unix ms đầu ngày. */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** Giới hạn dữ liệu đưa vào ngữ cảnh AI — tương tự cap_rows của Vibe-Trading. */
export const MAX_CANDLES = 90

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (res.status === 429) {
    throw new Error("Nguồn dữ liệu đang giới hạn tần suất (429). Đợi khoảng 1 phút rồi thử lại.")
  }
  if (!res.ok) throw new Error(`Nguồn dữ liệu trả về lỗi ${res.status}.`)
  return res.json()
}

/** Top coin theo vốn hóa, kèm sparkline 7 ngày (CoinGecko public API). */
export async function fetchTopCoins(limit = 20): Promise<CoinRow[]> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc" +
    `&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`
  const data = (await fetchJson(url)) as Array<Record<string, unknown>>
  return data.map((c) => ({
    id: String(c.id),
    symbol: String(c.symbol ?? "").toUpperCase(),
    name: String(c.name ?? ""),
    image: String(c.image ?? ""),
    priceUsd: Number(c.current_price ?? 0),
    change24hPct: c.price_change_percentage_24h_in_currency as number | null,
    change7dPct: c.price_change_percentage_7d_in_currency as number | null,
    marketCapUsd: Number(c.market_cap ?? 0),
    volume24hUsd: Number(c.total_volume ?? 0),
    sparkline7d: ((c.sparkline_in_7d as { price?: number[] })?.price ?? []).filter(Number.isFinite),
  }))
}

/** Nến ngày từ Binance cho cặp <SYMBOL>USDT. */
async function fetchBinanceCandles(symbol: string): Promise<DailyCandle[]> {
  const pair = `${symbol.toUpperCase()}USDT`
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=${MAX_CANDLES}`
  const data = (await fetchJson(url)) as unknown[][]
  return data.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }))
}

/** Fallback: chuỗi giá ngày từ CoinGecko (không có OHLC riêng — dùng giá làm cả 4). */
async function fetchCoinGeckoCandles(coinId: string): Promise<DailyCandle[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${MAX_CANDLES}&interval=daily`
  const data = (await fetchJson(url)) as { prices?: [number, number][]; total_volumes?: [number, number][] }
  const prices = data.prices ?? []
  const volumes = new Map((data.total_volumes ?? []).map(([t, v]) => [t, v]))
  return prices.slice(-MAX_CANDLES).map(([time, price]) => ({
    time,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: volumes.get(time) ?? 0,
  }))
}

export interface CandleResult {
  candles: DailyCandle[]
  /** Nguồn thực tế đã dùng, hiển thị cho người dùng biết dữ liệu đến từ đâu. */
  source: "binance" | "coingecko"
}

/** Lấy nến ngày với chuỗi fallback: Binance trước, lỗi thì lùi về CoinGecko. */
export async function fetchDailyCandles(coin: { id: string; symbol: string }): Promise<CandleResult> {
  try {
    const candles = await fetchBinanceCandles(coin.symbol)
    if (candles.length > 0) return { candles, source: "binance" }
  } catch {
    // Cặp không có trên Binance hoặc API lỗi — thử nguồn dự phòng.
  }
  const candles = await fetchCoinGeckoCandles(coin.id)
  if (candles.length === 0) throw new Error("Không lấy được dữ liệu giá từ nguồn nào cho coin này.")
  return { candles, source: "coingecko" }
}
