"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  UserRound,
  X,
} from "lucide-react"
import { postUpdate } from "@/lib/construction/client"
import { compressImage } from "@/lib/construction/image-compress"
import {
  defaultMilestoneId,
  MILESTONE_STATUS_LABEL,
  progressJournalNote,
  progressStatus,
} from "@/lib/construction/progress-update"
import { MAX_PHOTOS_PER_UPDATE } from "@/lib/construction/schemas"
import type { MilestoneDTO } from "@/lib/construction/types"
import { INPUT, LABEL, STICKY_BAR, TAP } from "@/lib/construction/ui"

interface Picked {
  file: File
  preview: string
  caption: string
}

const QUICK_PCT = [25, 50, 75, 100] as const

/** Một lần lưu cập nhật đồng thời nhật ký hiện trường và % hạng mục. */
export function UpdateForm({
  projectId,
  milestones,
  onPosted,
}: {
  projectId: string
  milestones: MilestoneDTO[]
  onPosted: () => void | Promise<void>
}) {
  const initialMilestoneId = defaultMilestoneId(milestones)
  const initialMilestone = milestones.find((milestone) => milestone.id === initialMilestoneId)
  const [milestoneId, setMilestoneId] = useState(initialMilestoneId)
  const [percent, setPercent] = useState(initialMilestone?.percent ?? 0)
  const [delayed, setDelayed] = useState(initialMilestone?.status === "DELAYED")
  const [note, setNote] = useState("")
  const [author, setAuthor] = useState("")
  const [photos, setPhotos] = useState<Picked[]>([])
  const [compressing, setCompressing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const selectedMilestone = useMemo(
    () => milestones.find((milestone) => milestone.id === milestoneId),
    [milestoneId, milestones],
  )
  const status = progressStatus(percent, delayed)
  const hasDraft =
    note.trim().length > 0 ||
    photos.length > 0 ||
    Boolean(
      selectedMilestone &&
        (percent !== selectedMilestone.percent || delayed !== (selectedMilestone.status === "DELAYED")),
    )

  useEffect(() => {
    const saved = localStorage.getItem("hqt_author")
    if (saved) setAuthor(saved)
  }, [])

  const photosRef = useRef<Picked[]>([])
  photosRef.current = photos
  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview))
    }
  }, [])

  useEffect(() => {
    if (!hasDraft) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [hasDraft])

  function chooseMilestone(id: string) {
    const next = milestones.find((milestone) => milestone.id === id)
    setMilestoneId(id)
    setPercent(next?.percent ?? 0)
    setDelayed(next?.status === "DELAYED")
    setError(null)
    setSuccess(null)
  }

  function changePercent(value: number) {
    setPercent(Math.max(0, Math.min(100, value)))
    setSuccess(null)
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setError(null)
    setSuccess(null)
    setCompressing(true)

    let compressed: Picked[] = []
    try {
      compressed = await Promise.all(
        Array.from(list).map(async (file) => {
          const output = await compressImage(file)
          return { file: output, preview: URL.createObjectURL(output), caption: "" }
        }),
      )
    } catch (err) {
      compressed.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setError(
        err instanceof Error
          ? `Không đọc được ảnh: ${err.message}`
          : "Không đọc được ảnh. Thử chụp lại hoặc chọn ảnh khác.",
      )
      return
    } finally {
      setCompressing(false)
    }

    setPhotos((previous) => {
      const room = Math.max(0, MAX_PHOTOS_PER_UPDATE - previous.length)
      const accepted = compressed.slice(0, room)
      const rejected = compressed.slice(room)
      rejected.forEach((photo) => URL.revokeObjectURL(photo.preview))
      if (rejected.length > 0) setError(`Tối đa ${MAX_PHOTOS_PER_UPDATE} ảnh mỗi lần cập nhật.`)
      return [...previous, ...accepted]
    })
  }

  function removeAt(index: number) {
    setPhotos((previous) => {
      URL.revokeObjectURL(previous[index].preview)
      return previous.filter((_, photoIndex) => photoIndex !== index)
    })
    setSuccess(null)
  }

  async function submit() {
    const cleanNote = note.trim()
    if (!cleanNote) {
      setError("Nhập ngắn gọn công việc đã làm, vướng mắc hoặc bước tiếp theo.")
      return
    }

    setBusy(true)
    setError(null)
    setSuccess(null)
    setPct(photos.length > 0 ? 0 : null)
    try {
      const journalNote = selectedMilestone
        ? progressJournalNote(selectedMilestone.name, percent, status, cleanNote)
        : cleanNote

      await postUpdate(
        projectId,
        {
          note: journalNote,
          authorName: author.trim() || undefined,
          photos,
          milestoneUpdate: selectedMilestone
            ? { id: selectedMilestone.id, percent, status, note: cleanNote }
            : undefined,
        },
        (fraction) => setPct(Math.round(fraction * 100)),
      )

      if (author.trim()) localStorage.setItem("hqt_author", author.trim())
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setNote("")
      setPhotos([])
      setSuccess(
        selectedMilestone
          ? `Đã cập nhật “${selectedMilestone.name}” lên ${percent}% lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`
          : "Đã đăng nhật ký công trường.",
      )
      await onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cập nhật. Vui lòng thử lại.")
    } finally {
      setBusy(false)
      setPct(null)
    }
  }

  const full = photos.length >= MAX_PHOTOS_PER_UPDATE

  return (
    <div className="space-y-5">
      {milestones.length > 0 ? (
        <section aria-labelledby="progress-step" className="space-y-3">
          <div>
            <label id="progress-step" htmlFor="milestone" className="text-sm font-semibold text-gray-900 dark:text-white">
              1. Chọn hạng mục
            </label>
            <p className="mt-0.5 text-xs text-gray-500">Hệ thống ưu tiên hạng mục đang làm hoặc đang chậm.</p>
          </div>
          <select id="milestone" value={milestoneId} onChange={(event) => chooseMilestone(event.target.value)} className={INPUT}>
            <option value="">Cập nhật chung, không đổi % hạng mục</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name} · {milestone.percent}%
              </option>
            ))}
          </select>

          {selectedMilestone && (
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">Mức hoàn thành mới</span>
                <span className="font-mono text-2xl font-semibold tabular-nums text-primary">{percent}%</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => changePercent(percent - 5)} disabled={percent === 0} aria-label="Giảm 5 phần trăm" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 dark:border-gray-700">
                  <Minus className="h-4 w-4" />
                </button>
                <input type="range" min={0} max={100} step={5} value={percent} onChange={(event) => changePercent(Number(event.target.value))} aria-label={`Tiến độ mới của ${selectedMilestone.name}`} className="min-w-0 flex-1 accent-[color:var(--primary)]" />
                <button type="button" onClick={() => changePercent(percent + 5)} disabled={percent === 100} aria-label="Tăng 5 phần trăm" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40 dark:border-gray-700">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {QUICK_PCT.map((value) => (
                  <button key={value} type="button" onClick={() => changePercent(value)} className={`min-h-[40px] rounded-lg border text-sm font-medium transition-colors ${percent === value ? "border-primary bg-[color:var(--primary-soft)] text-primary" : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"}`}>
                    {value}%
                  </button>
                ))}
              </div>
              {percent < 100 && (
                <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-transparent px-1 text-sm text-gray-700 hover:bg-white dark:text-gray-200 dark:hover:bg-gray-900">
                  <input type="checkbox" checked={delayed} onChange={(event) => { setDelayed(event.target.checked); setSuccess(null) }} className="h-5 w-5 rounded border-gray-300 accent-[color:var(--primary)]" />
                  Đánh dấu hạng mục đang chậm tiến độ
                </label>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Trạng thái sau khi lưu: <strong className="font-medium text-gray-700 dark:text-gray-200">{MILESTONE_STATUS_LABEL[status]}</strong>
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Chưa có hạng mục. Cập nhật này sẽ được đăng vào nhật ký chung; bạn có thể tạo hạng mục ở tab “Hạng mục”.
        </div>
      )}

      <section aria-labelledby="detail-step" className="space-y-3">
        <div>
          <label id="detail-step" htmlFor="progress-note" className="text-sm font-semibold text-gray-900 dark:text-white">
            {milestones.length > 0 ? "2. Ghi nội dung cập nhật" : "1. Ghi nội dung cập nhật"}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">Nêu việc đã làm, vướng mắc và việc tiếp theo. Không cần viết dài.</p>
        </div>
        <textarea id="progress-note" value={note} onChange={(event) => { setNote(event.target.value); setError(null); setSuccess(null) }} rows={4} maxLength={1000} placeholder="Ví dụ: Đã lắp xong cột trục A–C. Chiều mai chuyển sang lắp kèo; đang chờ bổ sung ốc neo." className={`${INPUT} resize-y`} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <UserRound className="h-4 w-4" />
          <label htmlFor="update-author" className="sr-only">Người cập nhật</label>
          <input id="update-author" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Tên người cập nhật (không bắt buộc)" maxLength={100} className={`${INPUT} flex-1 sm:max-w-xs`} />
        </div>
      </section>

      <section aria-labelledby="photo-step" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 id="photo-step" className="text-sm font-semibold text-gray-900 dark:text-white">
              {milestones.length > 0 ? "3. Thêm ảnh hiện trường" : "2. Thêm ảnh hiện trường"}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">Không bắt buộc · tối đa {MAX_PHOTOS_PER_UPDATE} ảnh</p>
          </div>
          {photos.length > 0 && <span className="text-xs font-medium text-primary">{photos.length}/{MAX_PHOTOS_PER_UPDATE} ảnh</span>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => camRef.current?.click()} disabled={full || compressing || busy} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 ${TAP}`}>
            {compressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Chụp ảnh
          </button>
          <button type="button" onClick={() => pickRef.current?.click()} disabled={full || compressing || busy} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 ${TAP}`}>
            {compressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Chọn ảnh
          </button>
        </div>
        {compressing && <p className="text-xs text-gray-500" role="status">Đang tối ưu ảnh để tải nhanh hơn…</p>}

        <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { void addFiles(event.target.files); event.target.value = "" }} />
        <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { void addFiles(event.target.files); event.target.value = "" }} />

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div key={photo.preview} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`Ảnh hiện trường ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeAt(index)} aria-label={`Bỏ ảnh ${index + 1}`} className="absolute right-1.5 top-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-2">
                  <label htmlFor={`photo-caption-${index}`} className={LABEL}>Chú thích ảnh {index + 1}</label>
                  <input id={`photo-caption-${index}`} value={photo.caption} onChange={(event) => setPhotos((previous) => previous.map((item, photoIndex) => photoIndex === index ? { ...item, caption: event.target.value } : item))} placeholder="Vị trí hoặc nội dung ảnh" maxLength={500} className={`${INPUT} mt-1`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pct !== null && (
        <div aria-label={`Đã tải ${pct}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>
          <p className="text-right text-xs text-gray-500">Đang tải ảnh {pct}%</p>
        </div>
      )}

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      <div className={STICKY_BAR}>
        <button type="button" onClick={submit} disabled={busy || compressing} className={`btn-primary w-full justify-center disabled:opacity-50 sm:w-auto ${TAP}`}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu…</> : <><CheckCircle2 className="h-4 w-4" /> Lưu cập nhật</>}
        </button>
        {!busy && selectedMilestone && <span className="text-xs text-gray-500">{selectedMilestone.name}: {selectedMilestone.percent}% → {percent}%{photos.length > 0 ? ` · ${photos.length} ảnh` : ""}</span>}
      </div>
    </div>
  )
}
