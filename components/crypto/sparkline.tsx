"use client"

/** Đường giá 7 ngày thu nhỏ — SVG thuần, xanh khi tăng, đỏ khi giảm. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-xs text-gray-400">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 2
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2)
      const y = pad + (1 - (v - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const up = values[values.length - 1] >= values[0]
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Biểu đồ giá 7 ngày, ${up ? "tăng" : "giảm"}`}
      className={up ? "text-emerald-500" : "text-red-500"}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Biểu đồ đường giá lớn hơn cho coin đang chọn. */
export function PriceChart({ values, height = 160 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null
  const width = 560
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 6
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2)
      const y = pad + (1 - (v - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const up = values[values.length - 1] >= values[0]
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Biểu đồ giá đóng cửa 90 ngày"
        className={`w-full ${up ? "text-emerald-500" : "text-red-500"}`}
      >
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Thấp nhất: ${min.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
        <span>Cao nhất: ${max.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span>
      </div>
    </div>
  )
}
