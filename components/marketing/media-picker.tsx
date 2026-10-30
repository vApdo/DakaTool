"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ImagePlus, Play, X } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"
import { fb } from "./fb-theme"

export interface PickedMedia {
  key: string
  contentType: string
  sizeBytes: number
  /** URL xem trước: blob cục bộ khi vừa chọn, hoặc URL API khi đã lưu. */
  previewUrl: string
}

const MAX_PHOTOS = 10
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime"]

export const isVideo = (contentType: string) => contentType.startsWith("video/")

type Uploading = { id: number; name: string; video: boolean; progress: number }

/**
 * Hộp "Thêm ảnh/video" trong khung soạn bài, giống Facebook. Một bài có 1–10 ảnh
 * hoặc đúng 1 video (Facebook không cho trộn). Nút X bỏ hết và đóng hộp.
 */
export function MediaPicker({
  media,
  onChange,
  onClose,
}: {
  media: PickedMedia[]
  onChange: (media: PickedMedia[]) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const nextId = useRef(0)
  const [uploading, setUploading] = useState<Uploading[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const hasVideo = media.some((m) => isVideo(m.contentType)) || uploading.some((u) => u.video)
  const hasPhotos = media.some((m) => !isVideo(m.contentType)) || uploading.some((u) => !u.video)
  const full = hasVideo || media.length + uploading.length >= MAX_PHOTOS

  async function addFiles(picked: File[]) {
    setError(null)
    const files = picked.filter((f) => f.size > 0)
    if (files.length < picked.length) setError("Có file rỗng, đã bỏ qua.")
    const videos = files.filter((f) => VIDEO_TYPES.includes(f.type))
    const photos = files.filter((f) => PHOTO_TYPES.includes(f.type))
    const unknown = files.find((f) => !VIDEO_TYPES.includes(f.type) && !PHOTO_TYPES.includes(f.type))
    if (unknown) setError(`"${unknown.name}" không dùng được: chỉ nhận ảnh JPG, PNG, GIF hoặc video MP4, MOV.`)

    let chosen: File[]
    if (videos.length > 0) {
      if (hasVideo || hasPhotos || videos.length > 1 || photos.length > 0) {
        setError("Mỗi bài chỉ đăng được 1 video, không kèm ảnh. Bỏ ảnh/video đang có trước khi chọn video khác.")
        return
      }
      if (videos[0].size > MAX_VIDEO_BYTES) {
        setError(`"${videos[0].name}" nặng quá 1 GB.`)
        return
      }
      chosen = videos
    } else {
      if (hasVideo) {
        setError("Bài đã có video nên không thêm ảnh được.")
        return
      }
      const tooBig = photos.find((f) => f.size > MAX_PHOTO_BYTES)
      if (tooBig) setError(`"${tooBig.name}" nặng quá 8 MB.`)
      const room = MAX_PHOTOS - media.length - uploading.length
      const valid = photos.filter((f) => f.size <= MAX_PHOTO_BYTES)
      if (valid.length > room) setError(`Chỉ thêm được ${room} ảnh nữa (tối đa ${MAX_PHOTOS} ảnh mỗi bài).`)
      chosen = valid.slice(0, Math.max(room, 0))
    }
    if (chosen.length === 0) return

    const added: PickedMedia[] = []
    await Promise.all(
      chosen.map(async (file) => {
        const id = nextId.current++
        setUploading((list) => [...list, { id, name: file.name, video: isVideo(file.type), progress: 0 }])
        try {
          const uploaded = await marketingApi.uploadMedia(file, (progress) =>
            setUploading((list) => list.map((u) => (u.id === id ? { ...u, progress } : u))),
          )
          added.push({ ...uploaded, previewUrl: URL.createObjectURL(file) })
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : `Không tải được "${file.name}".`)
        } finally {
          setUploading((list) => list.filter((u) => u.id !== id))
        }
      }),
    )
    if (added.length) onChange([...media, ...added])
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...media]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }

  const empty = media.length === 0 && uploading.length === 0
  const video = media.find((m) => isVideo(m.contentType))

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void addFiles(Array.from(e.dataTransfer.files))
        }}
        className={`relative rounded-lg border p-2 ${fb.divider} ${dragging ? "ring-2 ring-[#1877F2]" : ""}`}
      >
        <button
          type="button"
          aria-label="Bỏ tất cả ảnh/video"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#CED0D4] bg-white text-[#65676B] hover:bg-[#F2F2F2] dark:border-[#3E4042] dark:bg-[#3A3B3C] dark:text-[#B0B3B8] dark:hover:bg-[#4E4F50]"
        >
          <X className="h-5 w-5" />
        </button>

        {empty ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-56 w-full flex-col items-center justify-center rounded-md bg-[#F7F8FA] hover:bg-[#EAEBED] dark:bg-[#323436] dark:hover:bg-[#3A3B3C]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4E6EB] dark:bg-[#4E4F50]">
              <ImagePlus className={`h-5 w-5 ${fb.text}`} />
            </span>
            <span className={`mt-2 text-[17px] font-semibold ${fb.text}`}>Thêm ảnh/video</span>
            <span className={`text-xs ${fb.muted}`}>hoặc kéo và thả</span>
          </button>
        ) : video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- video quảng cáo do team tự quay, không có phụ đề
          <video src={video.previewUrl} controls preload="metadata" className="max-h-80 w-full rounded-md bg-black" />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {media.map((item, index) => (
              <div key={item.key} className="relative aspect-square overflow-hidden rounded-md bg-black/5 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ/nội bộ */}
                <img src={item.previewUrl} alt={`Ảnh ${index + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-xs font-semibold text-white">{index + 1}</span>
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                  <button
                    type="button"
                    aria-label={`Đưa ảnh ${index + 1} lên trước`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bỏ ảnh ${index + 1}`}
                    onClick={() => onChange(media.filter((m) => m.key !== item.key))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-[#E41E3F]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa ảnh ${index + 1} ra sau`}
                    disabled={index === media.length - 1}
                    onClick={() => move(index, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {uploading.map((u) => (
              <div
                key={u.id}
                className={`flex flex-col items-center justify-center gap-2 rounded-md bg-[#F0F2F5] px-3 dark:bg-[#3A3B3C] ${u.video ? "col-span-3 h-40" : "aspect-square"}`}
              >
                {u.video && <Play className="h-6 w-6 text-[#1877F2]" />}
                <span className={`max-w-full truncate text-xs ${fb.muted}`}>{u.name}</span>
                <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[#CED0D4] dark:bg-[#4E4F50]">
                  <div className="h-full rounded-full bg-[#1877F2] transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                </div>
                <span className="text-xs font-semibold tabular-nums">{Math.round(u.progress * 100)}%</span>
              </div>
            ))}
            {!full && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-md bg-[#F0F2F5] text-sm font-semibold hover:bg-[#E4E6EB] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] ${fb.text}`}
              >
                <ImagePlus className="h-6 w-6" />
                Thêm ảnh
              </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={[...PHOTO_TYPES, ...VIDEO_TYPES].join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />
      <p className={`mt-1.5 text-xs ${fb.muted}`}>
        Tối đa {MAX_PHOTOS} ảnh (JPG, PNG, GIF, 8 MB/ảnh) hoặc 1 video (MP4, MOV, tối đa 1 GB). Không trộn ảnh với video.
      </p>
      {error && <p role="alert" className="mt-1.5 text-sm font-medium text-[#E41E3F]">{error}</p>}
    </div>
  )
}
