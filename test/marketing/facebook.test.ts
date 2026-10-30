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

const ACCOUNTS = { data: [{ id: "111", name: "ASIA GROUP", access_token: "page-token" }] }

describe("FacebookClient", () => {
  it("không để lộ token trang khi liệt kê Fanpage", async () => {
    const { fetchMock } = graph({ "GET me/accounts": ACCOUNTS })
    const pages = await new FacebookClient("system", "v26.0", fetchMock).listPages()
    expect(pages).toEqual([{ id: "111", name: "ASIA GROUP" }])
  })

  it("đăng ngay bài chữ + link bằng Page token", async () => {
    const { calls, fetchMock } = graph({ "GET me/accounts": ACCOUNTS, "POST 111/feed": { id: "111_9" } })
    const id = await new FacebookClient("system", "v26.0", fetchMock).publish({
      pageId: "111",
      message: "Xin chào",
      link: "https://asiagroup.vn",
      photos: [],
      scheduledAt: null,
    })
    expect(id).toBe("111_9")
    const feed = calls.find((c) => c.url.includes("/111/feed"))!
    expect((feed.init.headers as Record<string, string>).Authorization).toBe("Bearer page-token")
    const body = feed.init.body as URLSearchParams
    expect(body.get("link")).toBe("https://asiagroup.vn")
    expect(body.has("published")).toBe(false)
  })

  it("hẹn giờ bài nhiều ảnh: ảnh tạm chưa đăng rồi gắn vào bài", async () => {
    const { calls, fetchMock } = graph({ "GET me/accounts": ACCOUNTS, "POST 111/feed": { id: "111_10" } })
    const at = new Date("2026-11-01T02:00:00Z")
    await new FacebookClient("system", "v26.0", fetchMock).publish({
      pageId: "111",
      message: "Album",
      link: "https://bo-qua.vn",
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
    expect(body.has("link")).toBe(false)
  })

  it("báo lỗi khi Fanpage không còn được gán cho System User", async () => {
    const { fetchMock } = graph({ "GET me/accounts": ACCOUNTS })
    await expect(
      new FacebookClient("system", "v26.0", fetchMock).publish({ pageId: "999", message: "x", photos: [], scheduledAt: null }),
    ).rejects.toThrow(/không còn quyền quản lý Fanpage/)
  })

  it("xoá bài đã bị gỡ tay trên Fanpage vẫn coi là thành công", async () => {
    const { fetchMock } = graph({
      "GET me/accounts": ACCOUNTS,
      "DELETE 111_9": { error: { code: 100, error_subcode: 33, message: "Object does not exist" } },
    })
    await expect(new FacebookClient("system", "v26.0", fetchMock).deletePost("111_9")).resolves.toBeUndefined()
  })

  it("đổi lỗi Graph API sang tiếng Việt", async () => {
    const { fetchMock } = graph({ "GET me/accounts": { error: { code: 190, message: "Session expired" } } })
    const error = await new FacebookClient("system", "v26.0", fetchMock).listPages().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FacebookError)
    expect((error as Error).message).toMatch(/Token Facebook đã hết hạn/)
    expect(describeGraphError({ error: { code: 100, message: "Invalid scheduled publish time" } }, 400)).toMatch(/10 phút đến 30 ngày/)
    expect(describeGraphError({ error: { code: 200 } }, 403)).toMatch(/chưa có quyền/)
  })
})
