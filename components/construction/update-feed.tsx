"use client"

import { useState } from "react"
import { CalendarDays, ImageOff, Trash2, User } from "lucide-react"
import type { UpdateDTO } from "@/lib/construction/types"
import { PhotoLightbox } from "./photo-lightbox"

/** Nhật ký tiến độ: mỗi mục = chú thích + lưới ảnh, mới nhất trước. */
export function UpdateFeed({
  updates,
  onDelete,
}: {
  updates: UpdateDTO[]
  onDelete?: (updateId: string) => void
}) {
  const [viewer, setViewer] = useState<{ updateId: string; index: number } | null>(null)
  const active = viewer ? updates.find((u) => u.id === viewer.updateId) : null

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
        <ImageOff className="h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-500">Chưa có cập nhật nào từ công trường.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {updates.map((u) => (
        <article
          key={u.id}
          className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40"
        >
          <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(u.createdAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {u.authorName && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {u.authorName}
              </span>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(u.id)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa
              </button>
            )}
          </header>

          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {u.note}
          </p>

          {u.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {u.photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setViewer({ updateId: u.id, index: i })}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.caption ?? "Ảnh công trình"}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  {p.caption && (
                    <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] leading-snug text-white">
                      {p.caption}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </article>
      ))}

      {viewer && active && (
        <PhotoLightbox
          photos={active.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer({ ...viewer, index })}
        />
      )}
    </div>
  )
}
