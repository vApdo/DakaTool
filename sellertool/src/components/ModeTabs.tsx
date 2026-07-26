import type { Mode } from "../hooks/useCalcState"

const TABS: { id: Mode; label: string }[] = [
  { id: "breakdown", label: "Bóc tách phí" },
  { id: "reverse", label: "Tính ngược giá bán" },
]

/** Hai chế độ của tool — tab chuyển qua lại, thiết lập nhập chung. */
export function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Chế độ tính">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={mode === tab.id}
          aria-controls="calc-panel"
          className="mode-tab"
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              onChange(tab.id === "breakdown" ? "reverse" : "breakdown")
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
