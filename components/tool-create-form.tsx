"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Save, CheckCircle2 } from "lucide-react"
import { CATEGORIES } from "@/lib/data"
import type { ToolInputType } from "@/lib/types"

interface DraftInput {
  id: number
  label: string
  type: ToolInputType
}

const inputTypeLabels: Record<ToolInputType, string> = {
  text: "Ô nhập chữ",
  textarea: "Ô nhập nhiều dòng",
  number: "Ô nhập số",
  select: "Danh sách chọn",
  file: "Chọn file",
}

export function ToolCreateForm() {
  const [inputs, setInputs] = useState<DraftInput[]>([{ id: 1, label: "", type: "text" }])
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState("")

  function addInput() {
    setInputs((prev) => [...prev, { id: Date.now(), label: "", type: "text" }])
  }

  function removeInput(id: number) {
    setInputs((prev) => prev.filter((i) => i.id !== id))
  }

  function updateInput(id: number, patch: Partial<DraftInput>) {
    setInputs((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSavedName(String(form.get("name") || "Tool mới"))
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="card mx-auto max-w-2xl p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="mt-4 text-xl font-semibold text-black dark:text-white">Đã lưu &quot;{savedName}&quot;</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Bản MVP chưa ghi vào hệ thống — tool sẽ xuất hiện trong danh sách khi kết nối dữ liệu thật ở giai đoạn sau.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/tools" className="btn-primary">
            Về danh sách Tool
          </Link>
          <button type="button" onClick={() => setSaved(false)} className="btn-outline">
            Tạo tool khác
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <h2 className="mb-5 text-lg font-semibold text-black dark:text-white">Thông tin tool</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="field-label">
              Tên tool <span className="text-red-500">*</span>
            </label>
            <input id="name" name="name" type="text" required placeholder="Vd: Chuẩn hóa danh sách khách hàng" className="field-input" />
          </div>
          <div>
            <label htmlFor="description" className="field-label">
              Tool này làm gì? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              placeholder="Mô tả ngắn để đồng nghiệp hiểu tool dùng khi nào và cho ra kết quả gì."
              className="field-input resize-y"
            />
          </div>
          <div>
            <label htmlFor="category" className="field-label">Nhóm</label>
            <select id="category" name="category" className="field-input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="mb-2 mt-8 text-lg font-semibold text-black dark:text-white">Form nhập liệu khi chạy</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Khai báo những thông tin người dùng cần điền mỗi lần chạy tool.
        </p>
        <div className="space-y-3">
          {inputs.map((input, idx) => (
            <div key={input.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-[color:var(--card-border)] p-4">
              <div className="min-w-0 flex-1">
                <label htmlFor={`input-label-${input.id}`} className="field-label">
                  Nhãn trường {idx + 1}
                </label>
                <input
                  id={`input-label-${input.id}`}
                  type="text"
                  value={input.label}
                  onChange={(e) => updateInput(input.id, { label: e.target.value })}
                  placeholder="Vd: Đường dẫn thư mục"
                  className="field-input"
                />
              </div>
              <div className="w-44">
                <label htmlFor={`input-type-${input.id}`} className="field-label">
                  Kiểu
                </label>
                <select
                  id={`input-type-${input.id}`}
                  value={input.type}
                  onChange={(e) => updateInput(input.id, { type: e.target.value as ToolInputType })}
                  className="field-input"
                >
                  {Object.entries(inputTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeInput(input.id)}
                disabled={inputs.length === 1}
                className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--border)] text-gray-500 transition-colors hover:border-red-400 hover:text-red-500 disabled:opacity-40 disabled:pointer-events-none"
                aria-label={`Xóa trường ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addInput} className="btn-outline mt-4">
          <Plus className="h-4 w-4" />
          Thêm trường nhập liệu
        </button>
      </div>

      <aside className="space-y-6">
        <div className="card p-6">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Lưu tool</h2>
          <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
            Tool mới sẽ ở trạng thái Bản nháp cho đến khi bạn chạy thử thành công lần đầu.
          </p>
          <button type="submit" className="btn-primary w-full justify-center">
            <Save className="h-4 w-4" />
            Lưu tool
          </button>
        </div>
        <div className="card p-6">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Gợi ý</h2>
          <ul className="list-disc space-y-2 pl-4 text-sm text-gray-600 dark:text-gray-400">
            <li>Đặt tên theo kết quả tool tạo ra, vd &quot;Gộp CSV thành Excel&quot;.</li>
            <li>Bắt đầu từ một template có sẵn nếu quy trình tương tự.</li>
            <li>Chỉ hỏi những thông tin thay đổi giữa các lần chạy.</li>
          </ul>
        </div>
      </aside>
    </form>
  )
}
