"use client"

import { useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { PhotoDTO } from "@/lib/construction/types"

/** Xem ảnh phóng to; điều hướng bằng phím ←/→/Esc. Tự viết, không thư viện ngoài. */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: PhotoDTO[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + photos.length) % photos.length
      onNavigate(next)
    },
    [index, photos.length, onNavigate],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [go, onClose])

  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Ảnh sau"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full rounded-lg object-contain"
      />
      <div className="mt-3 max-w-2xl text-center text-sm text-white/90">
        {photo.caption && <p>{photo.caption}</p>}
        {photos.length > 1 && (
          <p className="mt-1 text-xs text-white/50">
            {index + 1} / {photos.length}
          </p>
        )}
      </div>
    </div>
  )
}
