import { describe, expect, it } from "vitest"
import { FacebookClient, FacebookError, describeGraphError } from "@/lib/marketing/facebook"

type Call = { url: string; init: RequestInit }

/** fetch giả theo "METHOD path"; ảnh tải lên được đánh số p1, p2... */
function graph(responses: Record<string, unknown>) {
  const calls: Call[] = []
  let photo = 0
  const fetchMock = ((url: string, init: RequestInit) => {
    calls.push({ url, init })
    const path = new URL(url).pathname.replace(/^\/v[\d.]+\//, "")
    const key = `${init.method ?? "GET"} ${path}`
    let body = responses[key]
    if (body === undefined && path.endsWith("/photos")) body = { id: `p${++photo}` }
    if (body === undefined) throw new Error(`Không có phản hồi giả cho ${key}`)
    const status = (body as { error?: unknown }).error ? 400 : 200
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  }) as typeof fetch
  return { calls, fetchMock }
}

const tokens = async (pageId: string) => (pageId === "111" ? "page-token" : null)
const client = (fetchMock: typeof fetch) => new FacebookClient(tokens, "v26.0", fetchMock)

describe("FacebookClient", () => {
  it("đổi mã đăng nhập lấy token dài hạn rồi lấy Fanpage được phép đăng", async () => {
    const { calls, fetchMock } = graph({
      "GET oauth/access_token": { access_token: "short" },
      "GET me": { name: "Vít Apdo" },
      "GET me/accounts": {
        data: [
          { id: "111", name: "ASIA GROUP", access_token: "page-token", tasks: ["CREATE_CONTENT", "MODERATE"] },
          { id: "222", name: "Chỉ xem", access_token: "x", tasks: ["ANALYZE"] },
        ],
      },
    })
    const fb = client(fetchMock)
    await fb.exchangeCode({ appId: "app", appSecret: "secret", redirectUri: "https://d/cb", code: "abc" })
    const exchanges = calls.filter((c) => c.url.includes("oauth/access_token")).map((c) => new URL(c.url).searchParams)
    expect(exchanges[0].get("code")).toBe("abc")
    expect(exchanges[1].get("grant_type")).toBe("fb_exchange_token")
    expect(exchanges[1].get("fb_exchange_token")).toBe("short")

    const { userName, pages } = await fb.managedPages("long")
    expect(userName).toBe("Vít Apdo")
    expect(pages).toEqual([{ id: "111", name: "ASIA GROUP", accessToken: "page-token" }])
  })

  it("link đăng nhập xin đủ quyền đăng bài và mang state", () => {
    const url = new URL(client(fetch).loginUrl("app", "https://d/cb", "st"))
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/v26.0/dialog/oauth")
    expect(url.searchParams.get("state")).toBe("st")
    expect(url.searchParams.get("scope")).toContain("pages_manage_posts")
  })

  it("đăng ngay bài chữ bằng Page token", async () => {
    const { calls, fetchMock } = graph({ "POST 111/feed": { id: "111_9" } })
    const id = await client(fetchMock).publish({
      pageId: "111",
      message: "Xin chào",
      photos: [],
      scheduledAt: null,
    })
    expect(id).toBe("111_9")
    const feed = calls.find((c) => c.url.includes("/111/feed"))!
    expect((feed.init.headers as Record<string, string>).Authorization).toBe("Bearer page-token")
    const body = feed.init.body as URLSearchParams
    expect(body.get("message")).toBe("Xin chào")
    expect(body.has("published")).toBe(false)
  })

  it("hẹn giờ bài nhiều ảnh: ảnh tạm chưa đăng rồi gắn vào bài", async () => {
    const { calls, fetchMock } = graph({ "POST 111/feed": { id: "111_10" } })
    const at = new Date("2026-11-01T02:00:00Z")
    await client(fetchMock).publish({
      pageId: "111",
      message: "Album",
      photos: [
        { data: new Blob(["a"], { type: "image/jpeg" }), filename: "a.jpg" },
        { data: new Blob(["b"], { type: "image/jpeg" }), filename: "b.jpg" },
      ],
      scheduledAt: at,
    })

    const uploads = calls.filter((c) => c.url.includes("/photos"))
    expect(uploads).toHaveLength(2)
    const form = uploads[0].init.body as FormData
    expect(form.get("published")).toBe("false")
    expect(form.get("temporary")).toBe("true")

    const body = calls.find((c) => c.url.includes("/feed"))!.init.body as URLSearchParams
    expect(body.get("attached_media[0]")).toBe(JSON.stringify({ media_fbid: "p1" }))
    expect(body.get("attached_media[1]")).toBe(JSON.stringify({ media_fbid: "p2" }))
    expect(body.get("published")).toBe("false")
    expect(body.get("scheduled_publish_time")).toBe(String(at.getTime() / 1000))
  })

  it("hẹn giờ bài video: Facebook tự tải từ link tạm qua graph-video", async () => {
    const { calls, fetchMock } = graph({ "POST 111/videos": { id: "777" } })
    const at = new Date("2026-11-01T02:00:00Z")
    const id = await client(fetchMock).publish({
      pageId: "111",
      message: "Clip khai trương",
      photos: [],
      video: { url: "https://r2.example/clip.mp4?sig=1" },
      scheduledAt: at,
    })
    expect(id).toBe("777")
    const call = calls.find((c) => c.url.includes("/videos"))!
    expect(new URL(call.url).host).toBe("graph-video.facebook.com")
    const form = call.init.body as FormData
    expect(form.get("file_url")).toBe("https://r2.example/clip.mp4?sig=1")
    expect(form.get("description")).toBe("Clip khai trương")
    expect(form.get("published")).toBe("false")
    expect(form.get("scheduled_publish_time")).toBe(String(at.getTime() / 1000))
    expect(calls.some((c) => c.url.includes("/feed"))).toBe(false)
  })

  it("trạng thái bài video đọc trường published và đổi permalink thành link đầy đủ", async () => {
    const { fetchMock } = graph({ "GET 777": { published: true, permalink_url: "/asiagroup/videos/777/" } })
    const status = await client(fetchMock).getPostStatus("777", "111")
    expect(status).toEqual({ isPublished: true, permalinkUrl: "https://www.facebook.com/asiagroup/videos/777/", createdTime: null })
  })

  it("báo lỗi khi Fanpage chưa được kết nối", async () => {
    const { fetchMock } = graph({})
    await expect(client(fetchMock).publish({ pageId: "999", message: "x", photos: [], scheduledAt: null })).rejects.toThrow(
      /chưa được kết nối/,
    )
  })

  it("xoá bài đã bị gỡ tay trên Fanpage vẫn coi là thành công", async () => {
    const { fetchMock } = graph({
      "DELETE 111_9": { error: { code: 100, error_subcode: 33, message: "Object does not exist" } },
    })
    await expect(client(fetchMock).deletePost("111_9", "111")).resolves.toBeUndefined()
  })

  it("đổi lỗi Graph API sang tiếng Việt", async () => {
    const { fetchMock } = graph({ "POST 111/feed": { error: { code: 190, message: "Session expired" } } })
    const error = await client(fetchMock)
      .publish({ pageId: "111", message: "x", photos: [], scheduledAt: null })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FacebookError)
    expect((error as Error).message).toMatch(/Kết nối lại/)
    expect(describeGraphError({ error: { code: 100, message: "Invalid scheduled publish time" } }, 400)).toMatch(/10 phút đến 30 ngày/)
    expect(describeGraphError({ error: { code: 200 } }, 403)).toMatch(/chưa có quyền/)
  })
})
