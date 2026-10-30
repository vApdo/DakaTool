"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarClock, ChevronDown, Globe2, ImageIcon, Loader2, PenLine, X } from "lucide-react"
import { marketingApi, type PostPayload } from "@/lib/marketing/client"
import type { MktPageDto, MktPostDto } from "@/lib/marketing/types"
import { fb } from "./fb-theme"
import { PageAvatar } from "./page-avatar"
import { MediaPicker, type PickedMedia } from "./media-picker"
import { fromLocalInput, toLocalInput } from "./format"

const AUTHOR_KEY = "dakatool.mkt.authorName"

function readAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? ""
  } catch {
    return ""
  }
}

function rememberAuthor(name: string) {
  try {
    localStorage.setItem(AUTHOR_KEY, name)
  } catch {
    // Không lưu được thì lần sau gõ lại tên, không ảnh hưởng bài viết.
  }
}

export type ComposerSection = "media" | "schedule"

/**
 * Khung "Tạo bài viết" giống hộp thoại của Facebook: chọn Fanpage, viết nội dung,
 * thêm ảnh/video và hẹn giờ, rồi Đăng (hoặc Lên lịch) hoặc Lưu nháp.
 */
export function ComposerDialog({
  pages,
  post,
  initialSection,
  onClose,
  onSaved,
}: {
  pages: MktPageDto[]
  /** Bài đang sửa; không có = bài mới. */
  post: MktPostDto | null
  initialSection?: ComposerSection
  onClose: () => void
  /** Gọi sau mỗi lần lưu/đăng để trang làm mới danh sách. */
  onSaved: (post: MktPostDto, published: boolean) => void
}) {
  const [current, setCurrent] = useState<MktPostDto | null>(post)
  const [fbPageId, setFbPageId] = useState(post?.fbPageId ?? pages[0]?.id ?? "")
  const [authorName, setAuthorName] = useState(post?.authorName ?? "")
  const [message, setMessage] = useState(post?.message ?? "")
  const [media, setMedia] = useState<PickedMedia[]>(
    post?.media.map((m) => ({ key: m.key, contentType: m.contentType, sizeBytes: m.sizeBytes, previewUrl: m.url })) ?? [],
  )
  const [scheduledLocal, setScheduledLocal] = useState(toLocalInput(post?.scheduledAt ?? null))
  const [open, setOpen] = useState<Record<ComposerSection, boolean>>({
    media: Boolean(post?.media.length) || initialSection === "media",
    schedule: Boolean(post?.scheduledAt) || initialSection === "schedule",
  })
  const [busy, setBusy] = useState<"publish" | "draft" | null>(null)
  const [error, setError] = useState<string | null>(current?.status === "FAILED" ? current.lastError : null)
  const [dirty, setDirty] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!post) setAuthorName(readAuthor())
    textRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [post])

  // Ô nội dung tự cao theo chữ, như Facebook.
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [message])

  function close() {
    if (busy) return
    if (dirty && !window.confirm("Bỏ bài viết này? Những thay đổi chưa lưu sẽ mất.")) return
    onClose()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setDirty(true)
    }
  }

  function toggle(section: ComposerSection) {
    setOpen((o) => ({ ...o, [section]: !o[section] }))
    if (section === "schedule" && !open.schedule && !scheduledLocal) {
      // Gợi ý sẵn 1 giờ sau, làm tròn 5 phút.
      const at = new Date(Date.now() + 60 * 60_000)
      at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5, 0, 0)
      setScheduledLocal(toLocalInput(at.toISOString()))
    }
  }

  const scheduling = open.schedule && Boolean(scheduledLocal)
  const page = pages.find((p) => p.id === fbPageId)
  const pageName = page?.name ?? current?.pageName ?? "Chọn Fanpage"
  const hasContent = message.trim().length > 0 || media.length > 0
  const canSubmit = Boolean(fbPageId) && hasContent && authorName.trim().length > 0 && busy === null
  const bigText = message.length < 85 && media.length === 0 && !open.media

  function payload(): PostPayload {
    return {
      fbPageId,
      message,
      scheduledAt: open.schedule ? fromLocalInput(scheduledLocal) : null,
      authorName: authorName.trim(),
      media: (open.media ? media : []).map(({ key, contentType, sizeBytes }) => ({ key, contentType, sizeBytes })),
    }
  }

  async function submit(publish: boolean) {
    setError(null)
    if (open.schedule && !fromLocalInput(scheduledLocal)) {
      setError("Chọn ngày giờ hẹn đăng, hoặc tắt hẹn giờ để đăng ngay.")
      return
    }
    setBusy(publish ? "publish" : "draft")
    rememberAuthor(authorName.trim())
    let saved: MktPostDto | null = null
    try {
      saved = current ? await marketingApi.updatePost(current.id, payload()) : await marketingApi.createPost(payload())
      setCurrent(saved)
      setDirty(false)
      if (publish) saved = await marketingApi.action(saved.id, "publish")
      onSaved(saved, publish)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được bài.")
      // Đăng lỗi thì bài vẫn được lưu (trạng thái "Đăng lỗi"): tải lại để danh sách cập nhật.
      if (saved) {
        const latest = await marketingApi.getPost(saved.id).catch(() => saved!)
        setCurrent(latest)
        onSaved(latest, false)
      }
    } finally {
      setBusy(null)
    }
  }

  const tools: { id: ComposerSection; label: string; icon: typeof ImageIcon; color: string }[] = [
    { id: "media", label: "Ảnh/video", icon: ImageIcon, color: "text-[#45BD62]" },
    { id: "schedule", label: "Hẹn giờ", icon: CalendarClock, color: "text-[#F3425F]" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-white/80 sm:items-center sm:p-4 dark:bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      style={fb.font}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mkt-composer-title"
        className={`flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-[500px] sm:rounded-lg sm:shadow-[0_12px_28px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[#242526] ${fb.text}`}
      >
        <header className={`relative flex h-[60px] shrink-0 items-center justify-center border-b ${fb.divider}`}>
          <h2 id="mkt-composer-title" className="text-xl font-bold">
            {current ? "Chỉnh sửa bài viết" : "Tạo bài viết"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#E4E6EB] text-[#606770] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:text-[#B0B3B8] dark:hover:bg-[#4E4F50]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <PageAvatar pageId={fbPageId || undefined} name={pageName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{pageName}</p>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                <label className="relative inline-flex h-6 items-center gap-1 rounded-md bg-[#E4E6EB] pl-2 pr-6 text-[13px] font-semibold dark:bg-[#3A3B3C]">
                  <Globe2 className="h-3 w-3" />
                  <span className="sr-only">Fanpage</span>
                  <select
                    value={fbPageId}
                    onChange={(e) => change(setFbPageId)(e.target.value)}
                    className="max-w-[160px] cursor-pointer appearance-none truncate bg-transparent outline-none"
                  >
                    {!fbPageId && <option value="">Chọn Fanpage</option>}
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {current && !pages.some((p) => p.id === current.fbPageId) && (
                      <option value={current.fbPageId}>{current.pageName}</option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5" />
                </label>
                <label className="inline-flex h-6 items-center gap-1 rounded-md bg-[#E4E6EB] px-2 text-[13px] font-semibold dark:bg-[#3A3B3C]">
                  <PenLine className="h-3 w-3 shrink-0" />
                  <span className="sr-only">Người đăng</span>
                  <input
                    value={authorName}
                    onChange={(e) => change(setAuthorName)(e.target.value)}
                    placeholder="Tên người đăng"
                    maxLength={100}
                    className="w-28 bg-transparent outline-none placeholder:font-normal placeholder:text-[#65676B] dark:placeholder:text-[#B0B3B8]"
                  />
                </label>
              </div>
            </div>
          </div>

          <label htmlFor="mkt-message" className="sr-only">Nội dung</label>
          <textarea
            id="mkt-message"
            ref={textRef}
            value={message}
            onChange={(e) => change(setMessage)(e.target.value)}
            maxLength={10_000}
            rows={bigText ? 3 : 2}
            placeholder={`Viết bài cho ${page?.name ?? "Fanpage"}...`}
            className={`mt-3 w-full resize-none bg-transparent leading-snug outline-none placeholder:text-[#65676B] dark:placeholder:text-[#B0B3B8] ${
              bigText ? "min-h-[120px] text-2xl" : "min-h-[60px] text-[15px]"
            }`}
          />

          {open.media && (
            <div className="mt-2">
              <MediaPicker
                media={media}
                onChange={change(setMedia)}
                onClose={() => {
                  setMedia([])
                  setOpen((o) => ({ ...o, media: false }))
                }}
              />
            </div>
          )}

          {open.schedule && (
            <div className={`mt-3 rounded-lg border p-3 ${fb.divider}`}>
              <label htmlFor="mkt-scheduled" className={`text-[13px] font-semibold ${fb.muted}`}>Hẹn giờ đăng</label>
              <input
                id="mkt-scheduled"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => change(setScheduledLocal)(e.target.value)}
                className={`mt-1 h-10 w-full rounded-md px-3 text-[15px] outline-none focus:ring-2 focus:ring-[#1877F2] [color-scheme:light] dark:[color-scheme:dark] ${fb.input}`}
              />
              <p className={`mt-1.5 text-xs ${fb.muted}`}>Từ 10 phút đến 30 ngày tới. Facebook sẽ tự đăng đúng giờ.</p>
            </div>
          )}

          <div className={`mt-4 flex items-center justify-between rounded-lg border px-4 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${fb.divider}`}>
            <span className="text-[15px] font-semibold">Thêm vào bài viết</span>
            <div className="flex gap-1">
              {tools.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={open[id]}
                  aria-label={label}
                  title={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${open[id] ? "bg-[#E7F3FF] dark:bg-[#263951]" : fb.hover}`}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-[#FFEBE9] px-3 py-2 text-sm text-[#C62828] dark:bg-[#4A2224] dark:text-[#FF7B72]">
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 gap-2 px-4 pb-4 pt-2">
          <button type="button" onClick={() => void submit(false)} disabled={!canSubmit} className={`h-9 ${fb.grayButton}`}>
            {busy === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu nháp
          </button>
          <button type="button" onClick={() => void submit(true)} disabled={!canSubmit} className={`h-9 flex-1 ${fb.blueButton}`}>
            {busy === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === "publish" ? "Đang đăng..." : scheduling ? "Lên lịch" : "Đăng"}
          </button>
        </footer>
      </div>
    </div>
  )
}
