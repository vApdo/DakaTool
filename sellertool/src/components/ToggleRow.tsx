interface ToggleRowProps {
  label: React.ReactNode
  sublabel?: string
  checked: boolean
  onChange: () => void
}

/** Hàng bật/tắt (gói dịch vụ sàn, thuế) — switch to đủ cho ngón cái. */
export function ToggleRow({ label, sublabel, checked, onChange }: ToggleRowProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="toggle-row" onClick={onChange}>
      <span>
        <span className="toggle-label">{label}</span>
        {sublabel && <span className="toggle-sub">{sublabel}</span>}
      </span>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </button>
  )
}
