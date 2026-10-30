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

  /**
   * Xin chỗ tải lên rồi PUT file (thẳng lên S3 hoặc qua máy chủ khi chạy cục bộ).
   * Dùng XMLHttpRequest để báo tiến độ — video có thể nặng tới 1 GB.
   */
  uploadMedia: async (file: File, onProgress?: (fraction: number) => void) => {
    const target = await apiRequest<{ key: string; url: string; method: "PUT"; headers: Record<string, string> }>(
      "/api/marketing/media",
      { method: "POST", body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }) },
    )
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(target.method, target.url)
      for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total)
      }
      const fail = () => reject(new Error(`Không tải được "${file.name}". Vui lòng thử lại.`))
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : fail())
      xhr.onerror = fail
      xhr.send(file)
    })
    return { key: target.key, contentType: file.type, sizeBytes: file.size }
  },
}
