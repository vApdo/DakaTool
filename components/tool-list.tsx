"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import type { Tool } from "@/lib/types"
import { CATEGORIES, formatDateTime } from "@/lib/data"
import { ToolIcon } from "./tool-icon"
import { ToolStatusBadge } from "./status-badge"

export function ToolList({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("Tất cả")

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      const matchCategory = category === "Tất cả" || tool.category === category
      const q = query.trim().toLowerCase()
      const matchQuery =
        q === "" ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags.some((t) => t.toLowerCase().includes(q))
      return matchCategory && matchQuery
    })
  }, [tools, query, category])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tool theo tên hoặc mô tả"
            className="field-input pl-9"
            aria-label="Tìm tool"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm">
          {["Tất cả", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-[#7A7FEE] text-white"
                  : "bg-[color:var(--card)] border border-[color:var(--card-border)] text-gray-700 hover:border-[#7A7FEE] dark:text-gray-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-black dark:text-white">Không tìm thấy tool nào</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Thử từ khóa khác, hoặc tạo tool mới cho việc bạn đang cần.
          </p>
          <Link href="/tools/new" className="btn-primary mt-5">
            Tạo Tool mới
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.id}`}
              className="card group p-6 shadow-md transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7A7FEE]/10 text-[#7A7FEE] transition-colors group-hover:bg-[#7A7FEE] group-hover:text-white">
                  <ToolIcon name={tool.icon} className="h-5 w-5" />
                </span>
                <ToolStatusBadge status={tool.status} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-black dark:text-white">{tool.name}</h3>
              <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{tool.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-black/5 px-2.5 py-0.5 font-medium dark:bg-white/10">
                  {tool.category}
                </span>
                <span>
                  {tool.runsCount} lượt · {formatDateTime(tool.lastRunAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
