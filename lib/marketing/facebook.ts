/**
 * Client Graph API tối giản cho việc đăng bài lên Fanpage.
 *
 * Xác thực bằng Facebook Login: người quản trị bấm "Kết nối Facebook" một lần,
 * DakaTool lưu Page token từng Fanpage (đã mã hoá) trong bảng MktPageConnection.
 * Token không bao giờ rời server — client chỉ thấy id và tên Fanpage.
 *
 * Hẹn giờ dùng tính năng gốc của Facebook (published=false + scheduled_publish_time)
 * nên không cần cron: bài nằm sẵn trong mục "Đã lên lịch" của Fanpage.
 */
import { UpstreamError } from "@/lib/http"

export const DEFAULT_GRAPH_VERSION = "v26.0"

/** Quyền xin khi đăng nhập Facebook. business_management cần cho Fanpage thuộc Business portfolio. */
export const LOGIN_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "read_insights",
  "business_management",
] as const

export interface FacebookPage {
  id: string
  name: string
}

export interface PageWithToken extends FacebookPage {
  accessToken: string
}

/** Trả về Page token của Fanpage, hoặc null nếu Fanpage chưa được kết nối. */
export type PageTokenSource = (pageId: string) => Promise<string | null>

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

export function facebookAppConfig(): { appId: string; appSecret: string; version: string } | null {
  const appId = process.env.FB_APP_ID?.trim()
  const appSecret = process.env.FB_APP_SECRET?.trim()
  if (!appId || !appSecret) return null
  return { appId, appSecret, version: process.env.FB_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION }
}

export function isFacebookConfigured(): boolean {
  return facebookAppConfig() !== null
}

/** Đổi lỗi Graph API sang câu tiếng Việt người dùng hiểu được và biết phải làm gì. */
export function describeGraphError(body: GraphErrorBody, status: number): string {
  const error = body.error
  const code = error?.code
  if (code === 190) {
    return "Kết nối Facebook đã hết hiệu lực (tài khoản đã kết nối đổi mật khẩu, mất quyền quản trị Fanpage hoặc gỡ ứng dụng). Bấm “Kết nối lại” ở trang Marketing."
  }
  if (code === 10 || code === 200 || (code !== undefined && code >= 200 && code < 300)) {
    return "Tài khoản Facebook đã kết nối chưa có quyền đăng lên Fanpage này. Bấm “Kết nối lại” ở trang Marketing và cho phép đủ các quyền Facebook hỏi."
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
  constructor(
    private readonly pageTokens: PageTokenSource,
    private readonly version: string = DEFAULT_GRAPH_VERSION,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private url(path: string): string {
    return `https://graph.facebook.com/${this.version}/${path.replace(/^\//, "")}`
  }

  private async call<T>(path: string, init: RequestInit & { token?: string }): Promise<T> {
    const { token, ...rest } = init
    let response: Response
    try {
      response = await this.fetchImpl(this.url(path), {
        ...rest,
        headers: token ? { Authorization: `Bearer ${token}`, ...rest.headers } : rest.headers,
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

  /** Link mở hộp thoại đăng nhập Facebook để người quản trị cấp quyền cho DakaTool. */
  loginUrl(appId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: LOGIN_SCOPES.join(","),
    })
    return `https://www.facebook.com/${this.version}/dialog/oauth?${params}`
  }

  /**
   * Đổi mã đăng nhập lấy token người dùng dài hạn (~60 ngày). Page token lấy từ token
   * dài hạn thì không có hạn dùng, chỉ mất hiệu lực khi người đó đổi mật khẩu, mất quyền
   * quản trị Fanpage hoặc gỡ ứng dụng.
   */
  async exchangeCode(input: { appId: string; appSecret: string; redirectUri: string; code: string }): Promise<string> {
    const short = await this.call<{ access_token: string }>(
      `oauth/access_token?${new URLSearchParams({
        client_id: input.appId,
        client_secret: input.appSecret,
        redirect_uri: input.redirectUri,
        code: input.code,
      })}`,
      { method: "GET" },
    )
    const long = await this.call<{ access_token: string }>(
      `oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: input.appId,
        client_secret: input.appSecret,
        fb_exchange_token: short.access_token,
      })}`,
      { method: "GET" },
    )
    return long.access_token
  }

  /** Tên người đã đăng nhập và các Fanpage họ được phép đăng bài, kèm Page token. */
  async managedPages(userToken: string): Promise<{ userName: string; pages: PageWithToken[] }> {
    const me = await this.call<{ name?: string }>("me?fields=name", { method: "GET", token: userToken })
    const result = await this.call<{ data: { id: string; name: string; access_token?: string; tasks?: string[] }[] }>(
      "me/accounts?fields=id,name,access_token,tasks&limit=100",
      { method: "GET", token: userToken },
    )
    const pages = result.data
      .filter((p) => p.access_token && (!p.tasks || p.tasks.includes("CREATE_CONTENT")))
      .map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token! }))
    return { userName: me.name ?? "Facebook", pages }
  }

  private async pageToken(pageId: string): Promise<string> {
    const token = await this.pageTokens(pageId)
    if (!token) {
      throw new UpstreamError("Fanpage này chưa được kết nối với DakaTool. Bấm “Kết nối lại” ở trang Marketing và chọn Fanpage này.")
    }
    return token
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

/** Client dùng Page token đã lưu trong database. */
export function createFacebookClient(pageTokens: PageTokenSource): FacebookClient {
  const config = facebookAppConfig()
  if (!config) {
    throw new UpstreamError("Chưa cấu hình ứng dụng Facebook. Người quản trị cần đặt FB_APP_ID và FB_APP_SECRET trên Vercel (xem docs/marketing-setup.md).")
  }
  return new FacebookClient(pageTokens, config.version)
}
