"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CalendarX2,
  ExternalLink,
  Globe2,
  Loader2,
  MoreHorizontal,
  PenLine,
  SendHorizonal,
  Trash2,
} from "lucide-react"
import type { MktPostDto } from "@/lib/marketing/types"
import { fb } from "./fb-theme"
import { formatDateTime, postTimeLabel } from "./format"
import { PageAvatar } from "./page-avatar"
import { PhotoGrid } from "./photo-grid"
import { PostStatusBadge } from "./post-status-badge"

export type PostCommand = "edit" | "publish" | "cancel" | "delete"

const LONG_MESSAGE = 320

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase()
  } catch {
    return url
  }
}

/** Một bài trong bảng tin, trình bày như bài trên Facebook, kèm thao tác theo trạng thái. */
export function PostCard({
  post,
  busy,
  onCommand,
}: {
  post: MktPostDto
  busy: boolean
  onCommand: (post: MktPostDto, command: PostCommand) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const editable = post.status === "DRAFT" || post.status === "FAILED"
  const long = post.message.length > LONG_MESSAGE && !expanded
  const text = long ? `${post.message.slice(0, LONG_MESSAGE - 40).trimEnd()}...` : post.message

  const menu: { command: PostCommand | "open"; label: string; icon: typeof PenLine; danger?: boolean }[] = []
  if (editable) menu.push({ command: "edit", label: "Chỉnh sửa bài viết", icon: PenLine })
  if (post.status === "SCHEDULED") menu.push({ command: "cancel", label: "Huỷ lịch, chuyển về nháp", icon: CalendarX2 })
  if (post.permalinkUrl) menu.push({ command: "open", label: "Xem trên Facebook", icon: ExternalLink })
  if (post.status !== "PUBLISHING") {
    menu.push({
      command: "delete",
      label: post.status === "PUBLISHED" || post.status === "SCHEDULED" ? "Xoá khỏi Facebook" : "Xoá bài viết",
      icon: Trash2,
      danger: true,
    })
  }

  function run(command: PostCommand | "open") {
    setMenuOpen(false)
    if (command === "open") {
      if (post.permalinkUrl) window.open(post.permalinkUrl, "_blank", "noopener,noreferrer")
      return
    }
    onCommand(post, command)
  }

  const actionClass = `flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-[15px] font-semibold disabled:opacity-50 ${fb.muted} ${fb.hover}`

  return (
    <article id={`post-${post.id}`} className={`${fb.card} scroll-mt-24`} aria-busy={busy}>
      <header className="flex items-start gap-2 px-4 pt-3">
        <PageAvatar pageId={post.fbPageId} name={post.pageName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-[15px] font-semibold">{post.pageName}</span>
            <PostStatusBadge status={post.status} />
          </p>
          <p className={`flex flex-wrap items-center gap-1 text-[13px] ${fb.muted}`}>
            <span title={post.publishedAt ? formatDateTime(post.publishedAt) : post.scheduledAt ? formatDateTime(post.scheduledAt) : undefined}>
              {postTimeLabel(post)}
            </span>
            <span aria-hidden>·</span>
            <Globe2 className="h-3 w-3" aria-label="Công khai" />
            <span aria-hidden>·</span>
            <span>{post.authorName}</span>
          </p>
        </div>
        {menu.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Tuỳ chọn bài viết"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={busy}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${fb.muted} ${fb.hover}`}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-20 w-64 rounded-lg bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[#242526] dark:ring-1 dark:ring-[#3E4042]"
              >
                {menu.map(({ command, label, icon: Icon, danger }) => (
                  <button
                    key={command}
                    type="button"
                    role="menuitem"
                    onClick={() => run(command)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[15px] font-medium ${fb.hover} ${
                      danger ? "text-[#E41E3F] dark:text-[#FF6B6B]" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {post.message && (
        <p className="whitespace-pre-wrap break-words px-4 pb-3 pt-2 text-[15px] leading-[1.34]">
          {text}
          {long && (
            <button type="button" onClick={() => setExpanded(true)} className="ml-1 font-semibold hover:underline">
              Xem thêm
            </button>
          )}
        </p>
      )}
      {!post.message && <div className="h-3" />}

      {post.media.length > 0 ? (
        <PhotoGrid urls={post.media.map((m) => m.url)} />
      ) : (
        post.link && (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block border-y px-4 py-3 ${fb.divider} bg-[#F0F2F5] hover:bg-[#E4E6EB] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50]`}
          >
            <span className={`block text-[13px] ${fb.muted}`}>{hostOf(post.link)}</span>
            <span className="block truncate text-[15px] font-semibold">{post.link}</span>
          </a>
        )
      )}

      {post.status === "FAILED" && post.lastError && (
        <p className="mx-4 mt-3 flex gap-2 rounded-md bg-[#FFEBE9] px-3 py-2 text-sm text-[#C62828] dark:bg-[#4A2224] dark:text-[#FF7B72]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {post.lastError}
        </p>
      )}

      {post.metric && (
        <div className={`flex items-center justify-between px-4 pt-2.5 text-[15px] ${fb.muted}`}>
          <span>{post.metric.reactions ?? 0} lượt thích</span>
          <span>
            {post.metric.comments ?? 0} bình luận · {post.metric.shares ?? 0} lượt chia sẻ
          </span>
        </div>
      )}

      <div className="px-4 pb-1 pt-1">
        <div className={`flex gap-1 border-t pt-1 ${fb.divider}`}>
          {editable && (
            <>
              <button type="button" onClick={() => run("edit")} disabled={busy} className={actionClass}>
                <PenLine className="h-5 w-5" />
                Chỉnh sửa
              </button>
              <button type="button" onClick={() => run("publish")} disabled={busy} className={actionClass}>
                <SendHorizonal className="h-5 w-5" />
                {post.status === "FAILED" ? "Đăng lại" : post.scheduledAt ? "Lên lịch" : "Đăng"}
              </button>
            </>
          )}
          {post.status === "SCHEDULED" && (
            <button type="button" onClick={() => run("cancel")} disabled={busy} className={actionClass}>
              <CalendarX2 className="h-5 w-5" />
              Huỷ lịch để sửa
            </button>
          )}
          {post.status === "PUBLISHED" &&
            (post.permalinkUrl ? (
              <a href={post.permalinkUrl} target="_blank" rel="noopener noreferrer" className={actionClass}>
                <ExternalLink className="h-5 w-5" />
                Xem trên Facebook
              </a>
            ) : (
              <span className={`${actionClass} pointer-events-none`}>Đã đăng lên Fanpage</span>
            ))}
          {post.status === "PUBLISHING" && (
            <span className={`${actionClass} pointer-events-none`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang đăng lên Facebook...
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
