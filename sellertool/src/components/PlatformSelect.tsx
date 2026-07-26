import type { Platform } from "../lib/fees"

interface PlatformSelectProps {
  platforms: Platform[]
  value: string
  onChange: (platformId: string) => void
}

/** Chọn sàn — segmented control, mỗi sàn một nút to. */
export function PlatformSelect({ platforms, value, onChange }: PlatformSelectProps) {
  return (
    <div className="segmented" role="group" aria-label="Chọn sàn">
      {platforms.map((p) => (
        <button
          key={p.id}
          type="button"
          className="segmented-option"
          aria-pressed={p.id === value}
          onClick={() => onChange(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
