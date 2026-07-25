/** Client fetch helpers cho module công trình (chạy trong trình duyệt). */
import type {
  ConstructionProjectDTO,
  ConstructionProjectDetailDTO,
  MilestoneDTO,
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

// ---- Nhật ký ảnh ----
export async function postUpdate(
  projectId: string,
  input: { note: string; authorName?: string; photos: Array<{ file: File; caption: string }> },
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const form = new FormData()
  form.append(
    "meta",
    JSON.stringify({
      note: input.note,
      authorName: input.authorName || undefined,
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
