"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, CheckCircle2, ImageIcon, Link2, Newspaper, RefreshCw, Unplug } from "lucide-react"
import { marketingApi } from "@/lib/marketing/client"
import type { MktConnectionDto, MktPostDto, MktPostStatus } from "@/lib/marketing/types"
import { ComposerDialog, type ComposerSection } from "./composer-dialog"
import { fb } from "./fb-theme"
import { facebookTime, formatDateTime } from "./format"
import { PageAvatar } from "./page-avatar"
import { PostCard, type PostCommand } from "./post-card"

/** Thông báo sau khi Facebook chuyển về trang Marketing (`?fb=...`, xem lib/marketing/oauth.ts). */
const RESULT_MESSAGE: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Đã kết nối Facebook." },
  cancelled: { tone: "warn", text: "Bạn đã huỷ đăng nhập Facebook, chưa có gì thay đổi." },
  no_pages: {
    tone: "warn",
    text: "Tài khoản này không có Fanpage nào được phép đăng bài, hoặc bạn chưa tích chọn Fanpage khi Facebook hỏi. Hãy kết nối lại.",
  },
  not_configured: { tone: "warn", text: "Chưa cấu hình ứng dụng Facebook (FB_APP_ID, FB_APP_SECRET)." },
  failed: { tone: "warn", text: "Kết nối Facebook không thành công. Vui lòng thử lại." },
}

type Filter = "ALL" | Exclude<MktPostStatus, "PUBLISHING">

const TABS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "DRAFT", label: "Nháp" },
  { id: "SCHEDULED", label: "Đã lên lịch" },
  { id: "PUBLISHED", label: "Đã đăng" },
  { id: "FAILED", label: "Lỗi" },
]

type Composer = { post: MktPostDto | null; section?: ComposerSection } | null

function sortKey(post: MktPostDto): number {
  return new Date(post.publishedAt ?? post.scheduledAt ?? post.updatedAt).getTime()
}

export function MarketingFeed() {
  const [connection, setConnection] = useState<MktConnectionDto | null>(null)
  const [posts, setPosts] = useState<MktPostDto[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ tone: "ok" | "warn"; text: string } | null>(null)
  const [filter, setFilter] = useState<Filter>("ALL")
  const [composer, setComposer] = useState<Composer>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoadError(null)
    try {
      setPosts(await marketingApi.listPosts())
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Không tải được danh sách bài.")
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fbResult = params.get("fb")
    if (fbResult && RESULT_MESSAGE[fbResult]) {
      setBanner(RESULT_MESSAGE[fbResult])
      params.delete("fb")
      const query = params.toString()
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`)
    }
    marketingApi.pages().then(setConnection, (reason: unknown) =>
      setBanner({ tone: "warn", text: reason instanceof Error ? reason.message : "Không tải được trạng thái kết nối Facebook." }),
    )
    void loadPosts()
  }, [loadPosts])

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([["ALL", posts?.length ?? 0]])
    for (const post of posts ?? []) map.set(post.status as Filter, (map.get(post.status as Filter) ?? 0) + 1)
    return map
  }, [posts])

  const visible = useMemo(
    () =>
      (posts ?? [])
        .filter((p) => filter === "ALL" || p.status === filter)
        .sort((a, b) => sortKey(b) - sortKey(a)),
    [posts, filter],
  )

  const upcoming = useMemo(
    () =>
      (posts ?? [])
        .filter((p) => p.status === "SCHEDULED" && p.scheduledAt)
        .sort((a, b) => sortKey(a) - sortKey(b))
        .slice(0, 6),
    [posts],
  )

  function upsert(post: MktPostDto) {
    setPosts((list) => [post, ...(list ?? []).filter((p) => p.id !== post.id)])
  }

  async function command(post: MktPostDto, cmd: PostCommand) {
    if (cmd === "edit") {
      setComposer({ post })
      return
    }
    const question = {
      publish: post.scheduledAt
        ? `Lên lịch đăng bài này lên ${post.pageName} lúc ${formatDateTime(post.scheduledAt)}?`
        : `Đăng bài này lên ${post.pageName} ngay bây giờ?`,
      cancel: "Huỷ lịch đăng? Bài sẽ bị gỡ khỏi mục Đã lên lịch trên Fanpage và quay về nháp để sửa.",
      delete:
        post.status === "PUBLISHED" || post.status === "SCHEDULED"
          ? "Bài này đã lên Facebook. Xoá sẽ gỡ bài khỏi Fanpage và không khôi phục được. Tiếp tục?"
          : "Xoá bài này? Không khôi phục được.",
    }[cmd]
    if (!window.confirm(question)) return

    setBusyId(post.id)
    setBanner(null)
    try {
      if (cmd === "delete") {
        await marketingApi.deletePost(post.id)
        setPosts((list) => (list ?? []).filter((p) => p.id !== post.id))
      } else {
        upsert(await marketingApi.action(post.id, cmd))
        if (cmd === "publish") setBanner({ tone: "ok", text: post.scheduledAt ? "Đã lên lịch trên Fanpage." : "Đã đăng lên Fanpage." })
      }
    } catch (reason) {
      setBanner({ tone: "warn", text: reason instanceof Error ? reason.message : "Không xử lý được. Vui lòng thử lại." })
      await loadPosts()
    } finally {
      setBusyId(null)
    }
  }

  async function disconnect() {
    if (!window.confirm("Ngắt kết nối mọi Fanpage? Bài đã hẹn giờ trên Facebook vẫn tự đăng, nhưng DakaTool sẽ không đăng hay huỷ lịch được nữa cho tới khi kết nối lại.")) return
    try {
      await marketingApi.disconnectFacebook()
      setConnection((c) => c && { ...c, pages: [], connectedBy: null, connectedAt: null })
    } catch (reason) {
      setBanner({ tone: "warn", text: reason instanceof Error ? reason.message : "Không ngắt kết nối được." })
    }
  }

  const pages = connection?.pages ?? []
  const connected = pages.length > 0
  const firstPage = pages[0]

  const connectionCard = connection && (
    <section className={`${fb.card} p-4`} aria-label="Kết nối Facebook">
      <h2 className="text-[17px] font-bold">Fanpage của bạn</h2>
      {!connection.configured ? (
        <p className="mt-2 flex gap-2 text-sm text-[#B26B00] dark:text-[#F7B928]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Người quản trị cần đặt FB_APP_ID và FB_APP_SECRET trên Vercel (xem docs/marketing-setup.md).
        </p>
      ) : connected ? (
        <>
          <ul className="-mx-2 mt-2">
            {pages.map((page) => (
              <li key={page.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                <PageAvatar pageId={page.id} name={page.name} size={36} />
                <span className="min-w-0 truncate text-[15px] font-medium">{page.name}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-2 text-[13px] ${fb.muted}`}>
            Kết nối qua {connection.connectedBy}
            {connection.connectedAt && ` · ${facebookTime(connection.connectedAt).toLowerCase()}`}
          </p>
          <div className="mt-3 flex gap-2">
            <a href={marketingApi.connectUrl} className={`h-9 flex-1 ${fb.grayButton}`}>
              <RefreshCw className="h-4 w-4" />
              Kết nối lại
            </a>
            <button type="button" onClick={() => void disconnect()} className={`h-9 ${fb.grayButton}`} aria-label="Ngắt kết nối Facebook" title="Ngắt kết nối">
              <Unplug className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={`mt-1 text-[15px] ${fb.muted}`}>
            Đăng nhập Facebook bằng tài khoản đang quản lý Fanpage, rồi chọn các Fanpage cho DakaTool đăng bài.
          </p>
          <a href={marketingApi.connectUrl} className={`mt-3 h-10 w-full ${fb.blueButton}`}>
            Kết nối Facebook
          </a>
        </>
      )}
    </section>
  )

  return (
    <div className={`-mx-4 -my-6 min-h-screen px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-my-8 lg:px-8 lg:py-6 ${fb.page}`} style={fb.font}>
      <div className="mx-auto grid max-w-[1240px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="mx-auto w-full max-w-[590px] space-y-4 xl:sticky xl:top-6 xl:max-w-none xl:self-start">{connectionCard}</aside>

        <div className="mx-auto w-full max-w-[590px] space-y-4">
          {banner && (
            <p
              role="status"
              className={`flex gap-2 rounded-lg px-4 py-3 text-[15px] ${
                banner.tone === "ok"
                  ? "bg-[#E6F4EA] text-[#1E7E34] dark:bg-[#1F3A2A] dark:text-[#5DD47A]"
                  : "bg-[#FFF4E5] text-[#8A5300] dark:bg-[#3D2E14] dark:text-[#F7B928]"
              }`}
            >
              {banner.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
              {banner.text}
            </p>
          )}

          <section className={`${fb.card} px-4 pb-2.5 pt-3`} aria-label="Soạn bài">
            <div className="flex items-center gap-2">
              <PageAvatar pageId={firstPage?.id} name={firstPage?.name ?? "DakaTool"} size={40} />
              <button
                type="button"
                onClick={() => setComposer({ post: null })}
                disabled={!connected}
                className={`h-10 flex-1 rounded-full px-3 text-left text-[17px] disabled:cursor-not-allowed ${fb.muted} ${fb.input} hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50]`}
              >
                {connected ? "Bạn muốn đăng gì lên Fanpage?" : "Kết nối Facebook để bắt đầu đăng bài"}
              </button>
            </div>
            <div className={`mt-3 flex border-t pt-2 ${fb.divider}`}>
              {(
                [
                  { section: "photos", label: "Ảnh", icon: ImageIcon, color: "text-[#45BD62]" },
                  { section: "schedule", label: "Hẹn giờ", icon: CalendarClock, color: "text-[#F3425F]" },
                  { section: "link", label: "Link", icon: Link2, color: "text-[#1877F2]" },
                ] as const
              ).map(({ section, label, icon: Icon, color }) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setComposer({ post: null, section })}
                  disabled={!connected}
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-[15px] font-semibold disabled:opacity-50 ${fb.muted} ${fb.hover}`}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={`${fb.card} px-4 pt-3`} aria-label="Lọc bài viết">
            <h2 className="text-xl font-bold">Bài viết</h2>
            <div className="mt-2 flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist">
              {TABS.map(({ id, label }) => {
                const active = filter === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(id)}
                    className={`relative shrink-0 rounded-md px-3 pb-3 pt-2 text-[15px] font-semibold ${
                      active ? "text-[#1877F2] dark:text-[#2D88FF]" : `${fb.muted} ${fb.hover}`
                    }`}
                  >
                    {label}
                    <span className="ml-1 tabular-nums opacity-80">{counts.get(id) ?? 0}</span>
                    {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-[#1877F2] dark:bg-[#2D88FF]" />}
                  </button>
                )
              })}
            </div>
          </section>

          {loadError ? (
            <div className={`${fb.card} p-4`}>
              <p role="alert" className="text-[15px] font-semibold text-[#E41E3F]">{loadError}</p>
              <button type="button" onClick={() => void loadPosts()} className={`mt-3 h-9 ${fb.grayButton}`}>
                <RefreshCw className="h-4 w-4" />
                Thử lại
              </button>
            </div>
          ) : posts === null ? (
            [0, 1].map((i) => (
              <div key={i} className={`${fb.card} p-4`} aria-busy="true" aria-label="Đang tải bài viết">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C]" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-[#E4E6EB] dark:bg-[#3A3B3C]" />
                    <div className="h-3 w-20 animate-pulse rounded bg-[#E4E6EB] dark:bg-[#3A3B3C]" />
                  </div>
                </div>
                <div className="mt-4 h-24 animate-pulse rounded bg-[#E4E6EB] dark:bg-[#3A3B3C]" />
              </div>
            ))
          ) : visible.length === 0 ? (
            <div className={`${fb.card} flex flex-col items-center px-6 py-12 text-center`}>
              <Newspaper className={`h-10 w-10 ${fb.muted}`} />
              <p className="mt-3 text-[17px] font-semibold">{posts.length === 0 ? "Chưa có bài viết nào" : "Không có bài nào ở mục này"}</p>
              {posts.length === 0 && (
                <p className={`mt-1 max-w-sm text-[15px] ${fb.muted}`}>Bài bạn soạn, hẹn giờ hoặc đã đăng sẽ hiện ở đây.</p>
              )}
            </div>
          ) : (
            visible.map((post) => <PostCard key={post.id} post={post} busy={busyId === post.id} onCommand={(p, c) => void command(p, c)} />)
          )}
        </div>

        <aside className="hidden space-y-4 2xl:sticky 2xl:top-6 2xl:block 2xl:self-start">
          <section className={`${fb.card} p-4`} aria-label="Sắp đăng">
            <h2 className={`text-[17px] font-semibold ${fb.muted}`}>Sắp đăng</h2>
            {upcoming.length === 0 ? (
              <p className={`mt-2 text-[15px] ${fb.muted}`}>Chưa có bài nào được hẹn giờ.</p>
            ) : (
              <ul className="-mx-2 mt-1">
                {upcoming.map((post) => (
                  <li key={post.id}>
                    <a href={`#post-${post.id}`} className={`flex gap-3 rounded-md px-2 py-2 ${fb.hover}`}>
                      {post.media[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh nội bộ qua API có kiểm tra quyền
                        <img src={post.media[0].url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#E7F3FF] dark:bg-[#263951]">
                          <CalendarClock className="h-6 w-6 text-[#1877F2]" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[15px] font-medium leading-tight">{post.message || post.link || "Bài ảnh"}</span>
                        <span className="mt-0.5 block text-[13px] font-semibold text-[#1877F2] dark:text-[#2D88FF]">
                          {facebookTime(post.scheduledAt!)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {(counts.get("FAILED") ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setFilter("FAILED")}
              className={`${fb.card} flex w-full items-center gap-3 p-4 text-left ${fb.hover}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFEBE9] dark:bg-[#4A2224]">
                <AlertTriangle className="h-5 w-5 text-[#E41E3F]" />
              </span>
              <span className="text-[15px]">
                <span className="font-semibold">{counts.get("FAILED")} bài đăng lỗi</span>
                <span className={`block ${fb.muted}`}>Xem lý do và đăng lại</span>
              </span>
            </button>
          )}
        </aside>
      </div>

      {composer && (
        <ComposerDialog
          key={composer.post?.id ?? "new"}
          pages={pages}
          post={composer.post}
          initialSection={composer.section}
          onClose={() => setComposer(null)}
          onSaved={(saved, published) => {
            upsert(saved)
            if (published) {
              setComposer(null)
              setBanner({ tone: "ok", text: saved.status === "SCHEDULED" ? "Đã lên lịch trên Fanpage." : "Đã đăng lên Fanpage." })
            } else if (saved.status !== "FAILED") {
              setComposer(null)
              setBanner({ tone: "ok", text: "Đã lưu nháp." })
            }
          }}
        />
      )}
    </div>
  )
}
