import type { PlatformCategory } from "../lib/fees"

interface CategorySelectProps {
  categories: PlatformCategory[]
  value: string
  onChange: (categoryId: string) => void
}

/** Chọn ngành hàng — select native cho quen tay trên điện thoại. */
export function CategorySelect({ categories, value, onChange }: CategorySelectProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor="category-select">
        Ngành hàng
      </label>
      <div className="select-wrap">
        <select id="category-select" value={value} onChange={(e) => onChange(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
