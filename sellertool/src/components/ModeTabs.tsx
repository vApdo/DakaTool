import { useRef } from "react"
import type { Mode } from "../hooks/useCalcState"

const TABS: { id: Mode; label: string }[] = [
  { id: "breakdown", label: "Bóc tách phí" },
  { id: "reverse", label: "Tính ngược giá bán" },
]

/**
 * Hai chế độ của tool — tab chuyển qua lại, thiết lập nhập chung.
 * Theo pattern WAI-ARIA Tabs: roving tabindex (chỉ tab đang chọn nằm trong
 * tab order) và phím mũi tên di chuyển CẢ focus lẫn selection sang tab kia.
 */
export function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const tabRefs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({})

  function select(next: Mode) {
    onChange(next)
    tabRefs.current[next]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    let next: Mode | null = null
    // 2 tab có wrap nên trái/phải đều sang tab còn lại; Home/End về tab đầu/cuối.
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") next = mode === "breakdown" ? "reverse" : "breakdown"
    else if (e.key === "Home") next = "breakdown"
    else if (e.key === "End") next = "reverse"
    if (next !== null) {
      e.preventDefault()
      select(next)
    }
  }

  return (
    <div className="mode-tabs" role="tablist" aria-label="Chế độ tính">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[tab.id] = el
          }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={mode === tab.id}
          aria-controls="calc-panel"
          tabIndex={mode === tab.id ? 0 : -1}
          className="mode-tab"
          onClick={() => onChange(tab.id)}
          onKeyDown={handleKeyDown}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
