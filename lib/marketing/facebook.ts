/**
 * Client Graph API tối giản cho việc đăng bài lên Fanpage.
 *
 * Xác thực bằng token System User trong Business Manager (FB_SYSTEM_USER_TOKEN):
 * từ token này gọi /me/accounts để lấy danh sách Fanpage và Page token từng trang.
 * Token không bao giờ rời server — client chỉ thấy id và tên Fanpage.
 *
 * Hẹn giờ dùng tính năng gốc của Facebook (published=false + scheduled_publish_time)
 * nên không cần cron: bài nằm sẵn trong mục "Đã lên lịch" của Fanpage.
 */
import { UpstreamError } from "@/lib/http"

const DEFAULT_GRAPH_VERSION = "v26.0"
const PAGE_CACHE_MS = 5 * 60 * 1000

export interface FacebookPage {
  id: string
  name: string
}

interface PageWithToken extends FacebookPage {
  accessToken: string
}

export interface PhotoUpload {
  data: Blob
  filename: string
}

export interface PublishInput {
  pageId: string
  message: string
  link?: string | null
  photos: PhotoUpload[]
  /** null = đăng ngay. */
  scheduledAt: Date | null
}

export interface PostStatus {
  isPublished: boolean
  permalinkUrl: string | null
  createdTime: string | null
}

type FetchLike = typeof fetch

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string }
}

/** Lỗi do Graph API trả về, kèm mã gốc để phân biệt vài trường hợp đặc biệt. */
export class FacebookError extends UpstreamError {
  constructor(
    message: string,
    readonly graphCode?: number,
    readonly graphSubcode?: number,
  ) {
    super(message)
    this.name = "FacebookError"
  }

  /** Bài/đối tượng không còn tồn tại (vd. đã bị xoá tay trên Fanpage). */
  get isMissingObject(): boolean {
    return this.graphCode === 100 && this.graphSubcode === 33
  }
}

export function isFacebookConfigured(): boolean {
  return Boolean(process.env.FB_SYSTEM_USER_TOKEN?.trim())
}

/** Đổi lỗi Graph API sang câu tiếng Việt người dùng hiểu được và biết phải làm gì. */
export function describeGraphError(body: GraphErrorBody, status: number): string {
  const error = body.error
  const code = error?.code
  if (code === 190) {
    return "Token Facebook đã hết hạn hoặc bị thu hồi. Người quản trị cần tạo token mới cho FB_SYSTEM_USER_TOKEN."
  }
  if (code === 10 || code === 200 || (code !== undefined && code >= 200 && code < 300)) {
    return "Tài khoản Facebook của DakaTool chưa có quyền đăng lên Fanpage này. Kiểm tra quyền của System User và các quyền pages_manage_posts, pages_read_engagement."
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return "Facebook đang giới hạn số lần gọi. Đợi vài phút rồi thử lại."
  }
  if (code === 100 && /schedul/i.test(error?.message ?? "")) {
    return "Facebook không nhận giờ hẹn này. Giờ hẹn phải cách hiện tại từ 10 phút đến 30 ngày."
  }
  if (code === 368) {
    return "Facebook tạm chặn đăng bài vì nội dung có thể vi phạm tiêu chuẩn cộng đồng."
  }
  const detail = error?.message ? ` (${error.message})` : ""
  return `Facebook từ chối yêu cầu${detail}. Mã HTTP ${status}.`
}

export class FacebookClient {
  private pagesCache: { at: number; pages: PageWithToken[] } | null = null

  constructor(
    private readonly systemToken: string,
    private readonly version: string = DEFAULT_GRAPH_VERSION,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private url(path: string): string {
    return `https://graph.facebook.com/${this.version}/${path.replace(/^\//, "")}`
  }

  private async call<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
    const { token, ...rest } = init
    let response: Response
    try {
      response = await this.fetchImpl(this.url(path), {
        ...rest,
        headers: { Authorization: `Bearer ${token}`, ...rest.headers },
        cache: "no-store",
      })
    } catch {
      throw new UpstreamError("Không kết nối được tới Facebook. Kiểm tra mạng rồi thử lại.")
    }
    const body = (await response.json().catch(() => ({}))) as T & GraphErrorBody
    if (!response.ok || body.error) {
      throw new FacebookError(describeGraphError(body, response.status), body.error?.code, body.error?.error_subcode)
    }
    return body
  }

  private async pagesWithTokens(): Promise<PageWithToken[]> {
    if (this.pagesCache && Date.now() - this.pagesCache.at < PAGE_CACHE_MS) return this.pagesCache.pages
    const result = await this.call<{ data: { id: string; name: string; access_token: string }[] }>(
      "me/accounts?fields=id,name,access_token&limit=100",
      { method: "GET", token: this.systemToken },
    )
    const pages = result.data.map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token }))
    this.pagesCache = { at: Date.now(), pages }
    return pages
  }

  async listPages(): Promise<FacebookPage[]> {
    return (await this.pagesWithTokens()).map(({ id, name }) => ({ id, name }))
  }

  private async pageToken(pageId: string): Promise<string> {
    const page = (await this.pagesWithTokens()).find((p) => p.id === pageId)
    if (!page) {
      throw new UpstreamError("DakaTool không còn quyền quản lý Fanpage này. Kiểm tra lại Fanpage được gán cho System User.")
    }
    return page.accessToken
  }

  /** Token Fanpage chứa bài viết — id bài có dạng "{pageId}_{postId}". */
  private async tokenForPost(postId: string): Promise<string> {
    return this.pageToken(postId.split("_")[0] ?? postId)
  }

  /**
   * Đăng ngay hoặc hẹn giờ. Có ảnh thì tải từng ảnh lên ở dạng chưa đăng rồi gắn vào
   * bài qua attached_media; ảnh cho bài hẹn giờ phải là `temporary` theo yêu cầu của Facebook.
   * Trả về id bài viết.
   */
  async publish(input: PublishInput): Promise<string> {
    const token = await this.pageToken(input.pageId)
    const scheduled = input.scheduledAt !== null

    const mediaIds: string[] = []
    for (const photo of input.photos) {
      const form = new FormData()
      form.set("source", photo.data, photo.filename)
      form.set("published", "false")
      if (scheduled) form.set("temporary", "true")
      const uploaded = await this.call<{ id: string }>(`${input.pageId}/photos`, { method: "POST", body: form, token })
      mediaIds.push(uploaded.id)
    }

    const params = new URLSearchParams()
    if (input.message) params.set("message", input.message)
    // Facebook bỏ qua link khi bài có ảnh đính kèm, nên chỉ gửi link cho bài không ảnh.
    if (input.link && mediaIds.length === 0) params.set("link", input.link)
    mediaIds.forEach((id, i) => params.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })))
    if (scheduled) {
      params.set("published", "false")
      params.set("scheduled_publish_time", String(Math.floor(input.scheduledAt!.getTime() / 1000)))
    }

    const created = await this.call<{ id: string }>(`${input.pageId}/feed`, { method: "POST", body: params, token })
    return created.id
  }

  async deletePost(postId: string): Promise<void> {
    const token = await this.tokenForPost(postId)
    try {
      await this.call<{ success: boolean }>(postId, { method: "DELETE", token })
    } catch (error) {
      // Đã bị xoá tay trên Fanpage thì coi như xoá xong.
      if (error instanceof FacebookError && error.isMissingObject) return
      throw error
    }
  }

  async getPostStatus(postId: string): Promise<PostStatus> {
    const token = await this.tokenForPost(postId)
    const post = await this.call<{ is_published?: boolean; permalink_url?: string; created_time?: string }>(
      `${postId}?fields=is_published,permalink_url,created_time`,
      { method: "GET", token },
    )
    return {
      isPublished: post.is_published ?? false,
      permalinkUrl: post.permalink_url ?? null,
      createdTime: post.created_time ?? null,
    }
  }
}

let cached: FacebookClient | undefined

export function getFacebookClient(): FacebookClient {
  const token = process.env.FB_SYSTEM_USER_TOKEN?.trim()
  if (!token) {
    throw new UpstreamError("Chưa kết nối Facebook. Người quản trị cần đặt biến FB_SYSTEM_USER_TOKEN trên Vercel (xem docs/marketing-setup.md).")
  }
  if (!cached) cached = new FacebookClient(token, process.env.FB_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION)
  return cached
}
