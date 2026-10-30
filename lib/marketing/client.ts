import type { MktConnectionDto, MktPostDto } from "./types"

type ErrorPayload = { error?: { message?: string } }

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  })
  const payload = (await response.json().catch(() => ({}))) as T & ErrorPayload
  if (!response.ok) throw new Error(payload.error?.message ?? "Không xử lý được yêu cầu. Vui lòng thử lại.")
  return payload
}

export interface PostPayload {
  fbPageId: string
  message: string
  link: string
  scheduledAt: string | null
  authorName: string
  media: { key: string; contentType: string; sizeBytes: number }[]
}

export const marketingApi = {
  pages: () => apiRequest<MktConnectionDto>("/api/marketing/pages"),

  /** Trang bắt đầu đăng nhập Facebook — mở bằng điều hướng, không gọi fetch. */
  connectUrl: "/api/marketing/facebook/connect",

  disconnectFacebook: () => apiRequest<{ disconnected: true }>("/api/marketing/facebook", { method: "DELETE" }),

  listPosts: async (range?: { from: Date; to: Date }) => {
    const query = range ? `?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}` : ""
    return (await apiRequest<{ posts: MktPostDto[] }>(`/api/marketing/posts${query}`)).posts
  },

  getPost: (id: string) => apiRequest<MktPostDto>(`/api/marketing/posts/${encodeURIComponent(id)}`),

  createPost: (payload: PostPayload) =>
    apiRequest<MktPostDto>("/api/marketing/posts", { method: "POST", body: JSON.stringify(payload) }),

  updatePost: (id: string, payload: PostPayload) =>
    apiRequest<MktPostDto>(`/api/marketing/posts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deletePost: (id: string) =>
    apiRequest<{ deleted: true }>(`/api/marketing/posts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  action: (id: string, action: "publish" | "cancel") =>
    apiRequest<MktPostDto>(`/api/marketing/posts/${encodeURIComponent(id)}/${action}`, { method: "POST" }),

  /** Xin chỗ tải lên rồi PUT file (thẳng lên S3 hoặc qua máy chủ khi chạy cục bộ). */
  uploadPhoto: async (file: File) => {
    const target = await apiRequest<{ key: string; url: string; method: "PUT"; headers: Record<string, string> }>(
      "/api/marketing/media",
      { method: "POST", body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }) },
    )
    const response = await fetch(target.url, { method: target.method, headers: target.headers, body: file })
    if (!response.ok) throw new Error(`Không tải được ảnh "${file.name}". Vui lòng thử lại.`)
    return { key: target.key, contentType: file.type, sizeBytes: file.size }
  },
}
