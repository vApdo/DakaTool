/**
 * Chỉ báo kỹ thuật cơ bản, tính từ chuỗi giá đóng cửa.
 * Học theo lớp "factor" của Vibe-Trading nhưng thu gọn: thuần hàm, chạy được cả trong test Node.
 */

/** Trung bình động đơn giản của n phần tử cuối. */
export function sma(values: number[], n: number): number | null {
  if (values.length < n || n <= 0) return null
  const slice = values.slice(-n)
  return slice.reduce((sum, v) => sum + v, 0) / n
}

/** RSI theo Wilder (mặc định 14 kỳ). 0–100; >70 quá mua, <30 quá bán. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1]
    if (change >= 0) gain += change
    else loss -= change
  }
  let avgGain = gain / period
  let avgLoss = loss / period
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

/** Biến động: độ lệch chuẩn của lợi suất ngày (%) trên n kỳ cuối. */
export function dailyVolatility(closes: number[], n = 30): number | null {
  if (closes.length < n + 1) return null
  const slice = closes.slice(-(n + 1))
  const returns: number[] = []
  for (let i = 1; i < slice.length; i++) returns.push((slice[i] - slice[i - 1]) / slice[i - 1])
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * 100
}

/** Mức sụt giảm tối đa (%) từ đỉnh trong chuỗi giá. */
export function maxDrawdown(closes: number[]): number | null {
  if (closes.length < 2) return null
  let peak = closes[0]
  let worst = 0
  for (const price of closes) {
    if (price > peak) peak = price
    const drawdown = (price - peak) / peak
    if (drawdown < worst) worst = drawdown
  }
  return worst * 100
}

/** % thay đổi giữa phần tử cách đây n kỳ và phần tử cuối. */
export function pctChange(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null
  const past = closes[closes.length - 1 - n]
  if (past === 0) return null
  return ((closes[closes.length - 1] - past) / past) * 100
}
