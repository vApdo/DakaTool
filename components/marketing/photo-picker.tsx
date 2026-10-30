"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"

export interface PickedPhoto {
  key: string
  contentType: string
  sizeBytes: number
  /** URL xem trước: blob cục bộ khi vừa chọn, hoặc URL API khi đã lưu. */
  previewUrl: string
}

const MAX_PHOTOS = 10
const MAX_BYTES = 8 * 1024 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/gif"]

export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: PickedPhoto[]
  onChange: (photos: PickedPhoto[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function addFiles(files: File[]) {
    setError(null)
    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      setError(`Mỗi bài tối đa ${MAX_PHOTOS} ảnh.`)
      return
    }
    const rejected = files.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES)
    if (rejected) {
      setError(`"${rejected.name}" không dùng được: chỉ nhận JPG, PNG, GIF tối đa 8 MB.`)
    }
    const valid = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES).slice(0, room)
    if (files.length > room) setError(`Chỉ thêm được ${room} ảnh nữa (tối đa ${MAX_PHOTOS} ảnh mỗi bài).`)
    if (valid.length === 0) return

    setUploading((n) => n + valid.length)
    const added: PickedPhoto[] = []
    for (const file of valid) {
      try {
        const uploaded = await marketingApi.uploadPhoto(file)
        added.push({ ...uploaded, previewUrl: URL.createObjectURL(file) })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : `Không tải được ảnh "${file.name}".`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (added.length) onChange([...photos, ...added])
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...photos]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) void addFiles(Array.from(e.dataTransfer.files))
        }}
        className={`grid grid-cols-3 gap-2 rounded-xl border border-dashed p-2 transition-colors sm:grid-cols-4 ${
          dragging ? "border-primary bg-[color:var(--primary-soft)]" : "border-[color:var(--card-border)]"
        }`}
      >
        {photos.map((photo, index) => (
          <div key={photo.key} className="group relative aspect-square overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ/nội bộ */}
            <img src={photo.previewUrl} alt={`Ảnh ${index + 1}`} className="h-full w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 text-xs font-medium text-white">{index + 1}</span>
            {!disabled && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Bỏ ảnh ${index + 1}`}
                  onClick={() => onChange(photos.filter((p) => p.key !== photo.key))}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Đưa ảnh ${index + 1} ra sau`}
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-black/60 text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Đang tải ảnh" />
          </div>
        ))}
        {!disabled && photos.length + uploading < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-gray-600 transition-colors hover:bg-[color:var(--primary-soft)] hover:text-primary dark:text-gray-400"
          >
            <ImagePlus className="h-6 w-6" />
            Thêm ảnh
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Kéo thả hoặc bấm “Thêm ảnh”. JPG, PNG, GIF, tối đa 8 MB/ảnh, {MAX_PHOTOS} ảnh/bài. Ảnh số 1 hiện to nhất.
      </p>
      {error && <p role="alert" className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
