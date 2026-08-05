/** Client fetch helpers cho module công trình (chạy trong trình duyệt). */
import type {
  ConstructionProjectDTO,
  ConstructionProjectDetailDTO,
  MilestoneDTO,
  MilestoneStatusDTO,
  CostItemDTO,
} from "./types"

const BASE = "/api/construction"

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {
      /* bỏ qua */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

const jsonHeaders = { "Content-Type": "application/json" }

// ---- Auth quản lý ----
export async function getAuthStatus(): Promise<{ configured: boolean; authorized: boolean }> {
  return jsonOrThrow(await fetch(`${BASE}/auth`, { cache: "no-store" }))
}
export async function login(code: string): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/auth`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ code }) }),
  )
}

// ---- Projects ----
export async function listProjects(): Promise<ConstructionProjectDTO[]> {
  const data = await jsonOrThrow<{ projects: ConstructionProjectDTO[] }>(
    await fetch(`${BASE}/projects`, { cache: "no-store" }),
  )
  return data.projects
}
export async function getProject(id: string): Promise<ConstructionProjectDetailDTO> {
  const data = await jsonOrThrow<{ project: ConstructionProjectDetailDTO }>(
    await fetch(`${BASE}/projects/${id}`, { cache: "no-store" }),
  )
  return data.project
}
export async function createProject(input: {
  name: string
  description?: string
}): Promise<string> {
  const data = await jsonOrThrow<{ id: string }>(
    await fetch(`${BASE}/projects`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(input) }),
  )
  return data.id
}

// ---- Upload trực tiếp lên storage ----
/**
 * Serverless giới hạn body của route handler ở 4.5MB — không đủ cho một lần đăng
 * 10 ảnh. Nên xin URL đã ký rồi PUT thẳng lên S3/R2, route handler chỉ nhận key.
 * Server chạy driver local không có presigned URL → trả null, quay lại multipart.
 */
interface UploadTicket {
  url: string
  method: "PUT"
  headers: Record<string, string>
  key: string
  expiresInSeconds: number
}

async function requestUploadTickets(
  projectId: string,
  target: "photo" | "doc",
  files: File[],
): Promise<UploadTicket[] | null> {
  const data = await jsonOrThrow<{ direct: boolean; uploads?: UploadTicket[] }>(
    await fetch(`${BASE}/projects/${projectId}/uploads`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        target,
        items: files.map((f) => ({
          filename: f.name,
          contentType: f.type || "application/octet-stream",
          sizeBytes: f.size,
        })),
      }),
    }),
  )
  return data.direct && data.uploads ? data.uploads : null
}

function putToStorage(
  ticket: UploadTicket,
  file: File,
  onBytes: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(ticket.method, ticket.url)
    // Header phải khớp đúng lúc ký URL, nếu không S3 trả 403.
    for (const [name, value] of Object.entries(ticket.headers)) {
      xhr.setRequestHeader(name, value)
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(e.loaded)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onBytes(file.size)
        resolve()
      } else {
        reject(new Error(`Tải file lên kho lưu trữ thất bại (${xhr.status}).`))
      }
    }
    xhr.onerror = () => reject(new Error("Không tải được file lên kho lưu trữ."))
    xhr.send(file)
  })
}

/** Upload nhiều file, gộp tiến độ theo tổng số byte đã gửi. */
async function uploadAll(
  tickets: UploadTicket[],
  files: File[],
  onProgress?: (fraction: number) => void,
): Promise<string[]> {
  const total = files.reduce((sum, f) => sum + f.size, 0) || 1
  const loaded = new Array<number>(files.length).fill(0)
  await Promise.all(
    tickets.map((ticket, i) =>
      putToStorage(ticket, files[i], (n) => {
        loaded[i] = n
        onProgress?.(Math.min(1, loaded.reduce((a, b) => a + b, 0) / total))
      }),
    ),
  )
  return tickets.map((t) => t.key)
}

// ---- Nhật ký ảnh ----
export async function postUpdate(
  projectId: string,
  input: {
    note: string
    authorName?: string
    photos: Array<{ file: File; caption: string }>
    milestoneUpdate?: { id: string; percent: number; status: MilestoneStatusDTO; note?: string }
  },
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const files = input.photos.map((p) => p.file)

  if (files.length === 0) {
    await jsonOrThrow(
      await fetch(`${BASE}/projects/${projectId}/updates`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          note: input.note,
          authorName: input.authorName,
          milestoneUpdate: input.milestoneUpdate,
        }),
      }),
    )
    return
  }

  const tickets = await requestUploadTickets(projectId, "photo", files)
  if (tickets) {
    const keys = await uploadAll(tickets, files, onProgress)
    await jsonOrThrow(
      await fetch(`${BASE}/projects/${projectId}/updates`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          note: input.note,
          authorName: input.authorName,
          milestoneUpdate: input.milestoneUpdate,
          photos: keys.map((storageKey, i) => ({
            storageKey,
            caption: input.photos[i].caption || undefined,
          })),
        }),
      }),
    )
    return
  }

  const form = new FormData()
  form.append(
    "meta",
    JSON.stringify({
      note: input.note,
      authorName: input.authorName || undefined,
      milestoneUpdate: input.milestoneUpdate,
      captions: input.photos.map((p) => p.caption),
    }),
  )
  for (const p of input.photos) form.append("photos", p.file)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE}/projects/${projectId}/updates`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let message = `Lỗi ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText) as { error?: { message?: string } }
          if (body.error?.message) message = body.error.message
        } catch {
          /* bỏ qua */
        }
        reject(new Error(message))
      }
    }
    xhr.onerror = () => reject(new Error("Không kết nối được máy chủ."))
    xhr.send(form)
  })
}

export async function deleteUpdate(updateId: string): Promise<void> {
  await jsonOrThrow(await fetch(`${BASE}/updates/${updateId}`, { method: "DELETE" }))
}

// ---- Hạng mục & chi phí ----
export type MilestoneRow = Omit<MilestoneDTO, "id" | "sortOrder"> & { id?: string }
export async function saveMilestones(projectId: string, milestones: MilestoneRow[]): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/milestones`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ milestones }),
    }),
  )
}
export type CostRow = Omit<CostItemDTO, "id" | "sortOrder"> & { id?: string }
export async function saveCosts(projectId: string, costItems: CostRow[]): Promise<void> {
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/costs`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ costItems }),
    }),
  )
}

// ---- Tài liệu ----
export async function uploadFile(
  projectId: string,
  file: File,
  kind: "PLAN" | "BUDGET" | "OTHER",
): Promise<void> {
  const tickets = await requestUploadTickets(projectId, "doc", [file])
  if (tickets) {
    await uploadAll(tickets, [file])
    await jsonOrThrow(
      await fetch(`${BASE}/projects/${projectId}/files`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ storageKey: tickets[0].key, filename: file.name, kind }),
      }),
    )
    return
  }

  const form = new FormData()
  form.append("file", file)
  form.append("kind", kind)
  await jsonOrThrow(
    await fetch(`${BASE}/projects/${projectId}/files`, { method: "POST", body: form }),
  )
}

/** Định dạng tiền VND gọn cho UI. */
export function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN") + " ₫"
}
