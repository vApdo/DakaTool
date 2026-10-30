"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ImageIcon, Megaphone, PenSquare, RefreshCw } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"
import { STATUS_LABEL } from "@/lib/marketing/labels"
import type { MktPostDto, MktPostStatus } from "@/lib/marketing/types"
import { PostStatusBadge } from "./post-status-badge"
import { postTimeLabel } from "./format"

const FILTERS: (MktPostStatus | "ALL")[] = ["ALL", "PENDING_REVIEW", "SCHEDULED", "PUBLISHED", "DRAFT", "REJECTED", "FAILED"]

export function PostList() {
  const [posts, setPosts] = useState<MktPostDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MktPostStatus | "ALL">("ALL")

  const load = useCallback(async () => {
    setError(null)
    try {
      setPosts(await marketingApi.listPosts())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được danh sách bài.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const map = new Map<MktPostStatus, number>()
    for (const post of posts ?? []) map.set(post.status, (map.get(post.status) ?? 0) + 1)
    return map
  }, [posts])

  const visible = (posts ?? []).filter((post) => filter === "ALL" || post.status === filter)

  if (error) {
    return (
      <div className="card p-6 text-sm">
        <p role="alert" className="font-medium text-red-600 dark:text-red-400">{error}</p>
        <button type="button" onClick={() => void load()} className="btn-outline mt-4">
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </div>
    )
  }

  if (posts === null) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải danh sách bài">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-primary">
          <Megaphone className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-semibold text-black dark:text-white">Chưa có bài nào</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Soạn bài đầu tiên, gửi trưởng nhóm duyệt, rồi đăng ngay hoặc hẹn giờ lên Fanpage.
        </p>
        <Link href="/marketing/new" className="btn-primary mt-5">
          <PenSquare className="h-4 w-4" />
          Soạn bài
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Lọc theo trạng thái">
        {FILTERS.map((f) => {
          const count = f === "ALL" ? posts.length : counts.get(f) ?? 0
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "accent-fill" : "border border-[color:var(--card-border)] text-gray-700 hover:border-primary dark:text-gray-300"
              }`}
            >
              {f === "ALL" ? "Tất cả" : STATUS_LABEL[f]}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="card p-6 text-sm text-gray-600 dark:text-gray-400">Không có bài nào ở trạng thái này.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((post) => (
            <li key={post.id}>
              <Link
                href={`/marketing/${post.id}`}
                className="card flex gap-4 p-4 transition-colors hover:border-primary sm:p-5"
              >
                {post.media[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh nội bộ qua API có kiểm tra quyền
                  <img src={post.media[0].url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-400 dark:bg-white/[0.05] sm:h-20 sm:w-20">
                    <ImageIcon className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PostStatusBadge status={post.status} />
                    <span className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{post.pageName}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-black dark:text-white">
                    {post.message || post.link || "(Chỉ có ảnh)"}
                  </p>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {postTimeLabel(post)} · {post.authorName}
                    {post.media.length > 1 && ` · ${post.media.length} ảnh`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
