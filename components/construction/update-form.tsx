"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { postUpdate } from "@/lib/construction/client"
import { compressImage } from "@/lib/construction/image-compress"
import { MAX_PHOTOS_PER_UPDATE } from "@/lib/construction/schemas"

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
  const inputRef = useRef<HTMLInputElement>(null)

  // Nhớ tên người đăng cho lần sau.
  useEffect(() => {
    const saved = localStorage.getItem("hqt_author")
    if (saved) setAuthor(saved)
  }, [])

  async function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const room = MAX_PHOTOS_PER_UPDATE - photos.length
    const files = Array.from(list).slice(0, Math.max(0, room))
    if (files.length < list.length) {
      setError(`Tối đa ${MAX_PHOTOS_PER_UPDATE} ảnh mỗi lần đăng.`)
    }
    const compressed = await Promise.all(
      files.map(async (f) => {
        const file = await compressImage(f)
        return { file, preview: URL.createObjectURL(file), caption: "" }
      }),
    )
    setPhotos((prev) => [...prev, ...compressed])
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

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Chú thích tiến độ hôm nay (vd: Đã đổ xong móng trục A–C, chuẩn bị dựng cột thép…)"
        className="w-full resize-y rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700"
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary text-sm">
          <ImagePlus className="h-4 w-4" /> Chọn ảnh ({photos.length}/{MAX_PHOTOS_PER_UPDATE})
        </button>
        <input
          ref={inputRef}
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
          className="flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-sm dark:border-gray-700"
        />
      </div>

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
                  aria-label="Bỏ ảnh"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={p.caption}
                onChange={(e) =>
                  setPhotos((prev) => prev.map((x, idx) => (idx === i ? { ...x, caption: e.target.value } : x)))
                }
                placeholder="Chú thích ảnh"
                className="mt-1.5 w-full rounded-md border border-gray-200 bg-transparent px-2 py-1 text-xs dark:border-gray-700"
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

      <button type="button" onClick={submit} disabled={busy} className="btn-primary w-full justify-center disabled:opacity-50">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng…
          </>
        ) : (
          "Đăng cập nhật"
        )}
      </button>
    </div>
  )
}
