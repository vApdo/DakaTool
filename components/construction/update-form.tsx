"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, ImagePlus, Loader2, X } from "lucide-react"
import { postUpdate } from "@/lib/construction/client"
import { compressImage } from "@/lib/construction/image-compress"
import { MAX_PHOTOS_PER_UPDATE } from "@/lib/construction/schemas"
import { INPUT, STICKY_BAR, TAP } from "@/lib/construction/ui"

interface Picked {
  file: File
  preview: string
  caption: string
}

/** Form đăng nhật ký tiến độ: ảnh (nén phía trình duyệt) + chú thích từng ảnh + ghi chú chung. */
export function UpdateForm({ projectId, onPosted }: { projectId: string; onPosted: () => void }) {
  const [note, setNote] = useState("")
  const [author, setAuthor] = useState("")
  const [photos, setPhotos] = useState<Picked[]>([])
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  // Nhớ tên người đăng cho lần sau.
  useEffect(() => {
    const saved = localStorage.getItem("hqt_author")
    if (saved) setAuthor(saved)
  }, [])

  // Thu hồi blob URL khi rời trang để không rò rỉ bộ nhớ.
  const photosRef = useRef<Picked[]>([])
  photosRef.current = photos
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview))
    }
  }, [])

  async function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const compressed = await Promise.all(
      Array.from(list).map(async (f) => {
        const file = await compressImage(f)
        return { file, preview: URL.createObjectURL(file), caption: "" }
      }),
    )
    // Cắt theo state MỚI NHẤT (không dùng biến đóng cũ), tránh vượt giới hạn khi
    // người dùng chọn ảnh hai lần liên tiếp lúc đang nén.
    setPhotos((prev) => {
      const room = Math.max(0, MAX_PHOTOS_PER_UPDATE - prev.length)
      const accepted = compressed.slice(0, room)
      const rejected = compressed.slice(room)
      rejected.forEach((p) => URL.revokeObjectURL(p.preview))
      if (rejected.length > 0) {
        setError(`Tối đa ${MAX_PHOTOS_PER_UPDATE} ảnh mỗi lần đăng.`)
      }
      return [...prev, ...accepted]
    })
  }

  function removeAt(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  async function submit() {
    if (!note.trim()) {
      setError("Vui lòng nhập chú thích tiến độ.")
      return
    }
    setBusy(true)
    setError(null)
    setPct(0)
    try {
      await postUpdate(
        projectId,
        { note: note.trim(), authorName: author.trim() || undefined, photos },
        (f) => setPct(Math.round(f * 100)),
      )
      if (author.trim()) localStorage.setItem("hqt_author", author.trim())
      photos.forEach((p) => URL.revokeObjectURL(p.preview))
      setNote("")
      setPhotos([])
      onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng thất bại.")
    } finally {
      setBusy(false)
      setPct(null)
    }
  }

  const full = photos.length >= MAX_PHOTOS_PER_UPDATE

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Chú thích tiến độ hôm nay (vd: Đã đổ xong móng trục A–C, chuẩn bị dựng cột thép…)"
        className={`${INPUT} resize-y`}
      />

      {/* Hai lối vào ảnh: chụp ngay tại công trường, hoặc lấy ảnh đã chụp trước đó. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          disabled={full}
          className={`btn-secondary justify-center text-sm disabled:opacity-50 ${TAP}`}
        >
          <Camera className="h-4 w-4" /> Chụp ảnh
        </button>
        <button
          type="button"
          onClick={() => pickRef.current?.click()}
          disabled={full}
          className={`btn-secondary justify-center text-sm disabled:opacity-50 ${TAP}`}
        >
          <ImagePlus className="h-4 w-4" /> Chọn từ máy
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Đã chọn {photos.length}/{MAX_PHOTOS_PER_UPDATE} ảnh · ảnh được nén tự động trước khi tải lên
      </p>

      {/* capture="environment" mở thẳng camera sau trên điện thoại. */}
      <input
        ref={camRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ""
        }}
      />

      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Người cập nhật"
        className={INPUT}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <div key={p.preview} className="rounded-xl border border-gray-200 p-2 dark:border-gray-800">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Bỏ ảnh ${i + 1}`}
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                value={p.caption}
                onChange={(e) =>
                  setPhotos((prev) => prev.map((x, idx) => (idx === i ? { ...x, caption: e.target.value } : x)))
                }
                placeholder="Chú thích ảnh"
                className={`${INPUT} mt-1.5`}
              />
              <p className="mt-1 text-[11px] text-gray-400">{(p.file.size / 1024).toFixed(0)} KB</p>
            </div>
          ))}
        </div>
      )}

      {pct !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className={STICKY_BAR}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className={`btn-primary w-full justify-center disabled:opacity-50 ${TAP}`}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng…
            </>
          ) : photos.length > 0 ? (
            `Đăng ${photos.length} ảnh`
          ) : (
            "Đăng cập nhật"
          )}
        </button>
      </div>
    </div>
  )
}
