"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Globe2, Save, SendHorizonal, Trash2 } from "lucide-react"
import { marketingApi, type PostPayload } from "@/lib/marketing/client"
import type { MktPageDto, MktPostDto } from "@/lib/marketing/types"
import { PhotoPicker, type PickedPhoto } from "./photo-picker"
import { ReviewPanel } from "./review-panel"
import { fromLocalInput, toLocalInput } from "./format"

const AUTHOR_KEY = "dakatool.mkt.authorName"
const EDITABLE = new Set<MktPostDto["status"]>(["DRAFT", "PENDING_REVIEW", "REJECTED", "FAILED"])
const SUBMITTABLE = new Set<MktPostDto["status"]>(["DRAFT", "REJECTED", "FAILED"])

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

/** Xem trước gần giống một bài trên Fanpage, để người duyệt thấy bố cục ảnh và chữ. */
function FacebookPreview({ pageName, message, link, photos }: { pageName: string; message: string; link: string; photos: PickedPhoto[] }) {
  const shown = photos.slice(0, 4)
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--card-border)] bg-white text-[#050505] dark:bg-[#242526] dark:text-[#e4e6eb]">
      <div className="flex items-center gap-2.5 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white">
          {(pageName || "F").charAt(0).toUpperCase()}
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{pageName || "Tên Fanpage"}</p>
          <p className="flex items-center gap-1 text-xs text-[#65676b] dark:text-[#b0b3b8]">
            Vừa xong · <Globe2 className="h-3 w-3" />
          </p>
        </div>
      </div>
      {message && <p className="whitespace-pre-wrap break-words px-3 pb-3 text-[15px] leading-snug">{message}</p>}
      {shown.length > 0 ? (
        <div className={`grid gap-0.5 ${shown.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {shown.map((photo, i) => (
            <div key={photo.key} className={`relative ${shown.length === 3 && i === 0 ? "col-span-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước */}
              <img src={photo.previewUrl} alt="" className={`w-full object-cover ${shown.length === 1 ? "max-h-96" : "aspect-square"}`} />
              {i === 3 && photos.length > 4 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                  +{photos.length - 4}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        link && (
          <div className="mx-3 mb-3 truncate rounded-lg bg-[#f0f2f5] px-3 py-2.5 text-xs text-[#65676b] dark:bg-[#3a3b3c] dark:text-[#b0b3b8]">
            {link}
          </div>
        )
      )}
      {!message && shown.length === 0 && !link && (
        <p className="px-3 pb-4 text-sm text-[#65676b] dark:text-[#b0b3b8]">Nội dung bài sẽ hiện ở đây.</p>
      )}
    </div>
  )
}

export function PostEditor({ postId }: { postId?: string }) {
  const router = useRouter()
  const [post, setPost] = useState<MktPostDto | null>(null)
  const [pages, setPages] = useState<MktPageDto[]>([])
  const [fbConfigured, setFbConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [fbPageId, setFbPageId] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [message, setMessage] = useState("")
  const [link, setLink] = useState("")
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [mode, setMode] = useState<"now" | "schedule">("now")
  const [scheduledLocal, setScheduledLocal] = useState("")

  function fill(dto: MktPostDto) {
    setPost(dto)
    setFbPageId(dto.fbPageId)
    setAuthorName(dto.authorName)
    setMessage(dto.message)
    setLink(dto.link ?? "")
    setPhotos(dto.media.map((m) => ({ key: m.key, contentType: m.contentType, sizeBytes: m.sizeBytes, previewUrl: m.url })))
    setMode(dto.scheduledAt ? "schedule" : "now")
    setScheduledLocal(toLocalInput(dto.scheduledAt))
  }

  useEffect(() => {
    let active = true
    const pagesTask = marketingApi.pages().then(
      (result) => {
        if (!active) return
        setFbConfigured(result.configured)
        setPages(result.pages)
        if (!postId && result.pages.length === 1) setFbPageId(result.pages[0].id)
      },
      (reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Không tải được danh sách Fanpage."),
    )
    const postTask = postId
      ? marketingApi.getPost(postId).then(
          (dto) => active && fill(dto),
          (reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Không tải được bài viết."),
        )
      : Promise.resolve(active && setAuthorName(readAuthor()))
    void Promise.all([pagesTask, postTask]).finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [postId])

  const editable = !post || EDITABLE.has(post.status)
  const pageName = pages.find((p) => p.id === fbPageId)?.name ?? post?.pageName ?? ""

  function payload(): PostPayload {
    return {
      fbPageId,
      message,
      link,
      scheduledAt: mode === "schedule" ? fromLocalInput(scheduledLocal) : null,
      authorName,
      media: photos.map(({ key, contentType, sizeBytes }) => ({ key, contentType, sizeBytes })),
    }
  }

  async function save(submit: boolean) {
    setError(null)
    setNotice(null)
    if (mode === "schedule" && !fromLocalInput(scheduledLocal)) {
      setError("Chọn ngày giờ hẹn đăng, hoặc chọn \"Đăng ngay khi duyệt\".")
      return
    }
    setBusy(true)
    try {
      rememberAuthor(authorName.trim())
      let saved = post ? await marketingApi.updatePost(post.id, payload()) : await marketingApi.createPost(payload())
      if (submit && SUBMITTABLE.has(saved.status)) saved = await marketingApi.action(saved.id, "submit")
      fill(saved)
      setNotice(submit ? "Đã gửi duyệt. Trưởng nhóm mở bài này để duyệt." : "Đã lưu.")
      if (!post) router.replace(`/marketing/${saved.id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được bài.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!post) return
    const onFacebook = post.status === "SCHEDULED" || post.status === "PUBLISHED"
    const question = onFacebook
      ? "Bài này đã lên Facebook. Xoá sẽ gỡ bài khỏi Fanpage và không khôi phục được. Tiếp tục?"
      : "Xoá bài này? Không khôi phục được."
    if (!window.confirm(question)) return
    setBusy(true)
    setError(null)
    try {
      await marketingApi.deletePost(post.id)
      router.push("/marketing")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không xoá được bài.")
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="card h-96 animate-pulse" aria-busy="true" aria-label="Đang tải" />
  }

  if (postId && !post) {
    return <p role="alert" className="card p-6 text-sm font-medium text-red-600 dark:text-red-400">{error ?? "Không tìm thấy bài viết."}</p>
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {!fbConfigured && (
          <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Chưa kết nối Facebook. Người quản trị cần đặt biến FB_SYSTEM_USER_TOKEN trên Vercel (xem docs/marketing-setup.md).
          </p>
        )}

        <section className="card space-y-5 p-5 sm:p-6" aria-label="Nội dung bài">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mkt-page" className="field-label">Fanpage</label>
              <select
                id="mkt-page"
                value={fbPageId}
                onChange={(e) => setFbPageId(e.target.value)}
                disabled={!editable}
                className="field-input min-h-11"
              >
                <option value="">Chọn Fanpage</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>{page.name}</option>
                ))}
                {post && !pages.some((p) => p.id === post.fbPageId) && <option value={post.fbPageId}>{post.pageName}</option>}
              </select>
            </div>
            <div>
              <label htmlFor="mkt-author" className="field-label">Người soạn</label>
              <input
                id="mkt-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={!editable}
                maxLength={100}
                className="field-input min-h-11"
              />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="mkt-message" className="field-label">Nội dung</label>
              <span className="text-xs tabular-nums text-gray-500">{message.length.toLocaleString("vi-VN")}/10.000</span>
            </div>
            <textarea
              id="mkt-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!editable}
              rows={8}
              maxLength={10_000}
              className="field-input leading-relaxed"
              placeholder="Viết nội dung bài đăng..."
            />
          </div>

          <div>
            <span className="field-label">Ảnh</span>
            <PhotoPicker photos={photos} onChange={setPhotos} disabled={!editable} />
          </div>

          <div>
            <label htmlFor="mkt-link" className="field-label">Link <span className="font-normal text-gray-500">(không bắt buộc)</span></label>
            <input
              id="mkt-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={!editable}
              placeholder="https://..."
              className="field-input min-h-11"
            />
            {link && photos.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                Bài có ảnh thì Facebook không hiện khung link. Hãy dán link vào nội dung nếu cần.
              </p>
            )}
          </div>

          <fieldset>
            <legend className="field-label">Thời gian đăng</legend>
            <div className="flex flex-wrap gap-2">
              {(["now", "schedule"] as const).map((value) => (
                <label
                  key={value}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium ${
                    mode === value ? "border-primary bg-[color:var(--primary-soft)] text-primary" : "border-[color:var(--card-border)]"
                  } ${editable ? "" : "pointer-events-none opacity-60"}`}
                >
                  <input type="radio" name="mkt-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                  {value === "now" ? "Đăng ngay khi duyệt" : "Hẹn giờ"}
                </label>
              ))}
            </div>
            {mode === "schedule" && (
              <div className="mt-3 max-w-xs">
                <label htmlFor="mkt-scheduled" className="sr-only">Giờ hẹn</label>
                <input
                  id="mkt-scheduled"
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  disabled={!editable}
                  className="field-input min-h-11"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Từ 10 phút đến 30 ngày tính từ lúc duyệt.</p>
              </div>
            )}
          </fieldset>

          {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
          {notice && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{notice}</p>}

          <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--card-border)] pt-5">
            {editable && (
              <>
                {(!post || SUBMITTABLE.has(post.status)) && (
                  <button type="button" onClick={() => void save(true)} disabled={busy} className="btn-primary min-h-11">
                    <SendHorizonal className="h-4 w-4" />
                    Lưu & gửi duyệt
                  </button>
                )}
                <button type="button" onClick={() => void save(false)} disabled={busy} className="btn-outline min-h-11">
                  <Save className="h-4 w-4" />
                  {post?.status === "PENDING_REVIEW" ? "Lưu thay đổi" : "Lưu nháp"}
                </button>
              </>
            )}
            {!editable && post?.status !== "PUBLISHING" && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Bài đã lên Facebook nên không sửa được ở đây.</p>
            )}
            {post && post.status !== "PUBLISHING" && (
              <button type="button" onClick={() => void remove()} disabled={busy} className="btn-secondary ml-auto text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
                Xoá bài
              </button>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6">
        {post && <ReviewPanel post={post} onChange={fill} busy={busy} setBusy={setBusy} />}
        <section aria-label="Xem trước">
          <h2 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Xem trước</h2>
          <FacebookPreview pageName={pageName} message={message} link={link} photos={photos} />
        </section>
      </aside>
    </div>
  )
}
