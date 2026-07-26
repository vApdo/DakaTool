"use client"

import type { SubtitleStyle } from "@/lib/auto-subtitle/types"

const POSITIONS: Array<{ value: SubtitleStyle["position"]; label: string }> = [
  { value: "bottom", label: "Dưới" },
  { value: "middle", label: "Giữa" },
  { value: "top", label: "Trên" },
]

export function SubtitleStylePanel({
  style,
  onChange,
}: {
  style: SubtitleStyle
  onChange: (patch: Partial<SubtitleStyle>) => void
}) {
  return (
    <div className="space-y-4 text-sm">
      <Field label="Phông chữ">
        <input
          value={style.fontName}
          onChange={(e) => onChange({ fontName: e.target.value })}
          className="w-full rounded-md border border-gray-200 bg-transparent px-2 py-1.5 focus:border-primary focus:outline-none dark:border-gray-700"
        />
      </Field>
      <Field label={`Cỡ chữ (${style.fontSize})`}>
        <input
          type="range"
          min={16}
          max={120}
          value={style.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Màu chữ">
          <input
            type="color"
            value={style.primaryColor}
            onChange={(e) => onChange({ primaryColor: e.target.value.toUpperCase() })}
            className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700"
          />
        </Field>
        <Field label="Màu viền">
          <input
            type="color"
            value={style.outlineColor}
            onChange={(e) => onChange({ outlineColor: e.target.value.toUpperCase() })}
            className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700"
          />
        </Field>
      </div>
      <Field label={`Độ dày viền (${style.outlineWidth})`}>
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={style.outlineWidth}
          onChange={(e) => onChange({ outlineWidth: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
      <Field label="Vị trí">
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ position: p.value })}
              className={`flex-1 rounded-md border px-2 py-1.5 ${
                style.position === p.value
                  ? "border-primary bg-[color:var(--primary-soft)] text-primary"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Lề dọc (${style.marginV})`}>
        <input
          type="range"
          min={0}
          max={300}
          value={style.marginV}
          onChange={(e) => onChange({ marginV: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={style.backgroundEnabled}
          onChange={(e) => onChange({ backgroundEnabled: e.target.checked })}
        />
        <span>Nền phía sau chữ</span>
      </label>
      {style.backgroundEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Màu nền">
            <input
              type="color"
              value={style.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value.toUpperCase() })}
              className="h-9 w-full rounded-md border border-gray-200 dark:border-gray-700"
            />
          </Field>
          <Field label={`Độ mờ nền (${Math.round(style.backgroundOpacity * 100)}%)`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={style.backgroundOpacity}
              onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
