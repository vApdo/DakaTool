"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Eye, Loader2, Upload } from "lucide-react"
import { CostEditor } from "@/components/construction/cost-table"
import { ManagerGate } from "@/components/construction/manager-gate"
import { MilestoneEditor } from "@/components/construction/milestone-table"
import { UpdateFeed } from "@/components/construction/update-feed"
import { UpdateForm } from "@/components/construction/update-form"
import { deleteUpdate, getProject, uploadFile } from "@/lib/construction/client"
import type { ConstructionProjectDetailDTO } from "@/lib/construction/types"

/** Trang nhập liệu dành cho quản lý cấp trung (cần mã truy cập). */
export default function ManagePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/construction/${params.id}`} className="btn-secondary text-gray-600 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" />
          Trang theo dõi
        </Link>
      </div>
      <ManagerGate>
        <ManageContent projectId={params.id} />
      </ManagerGate>
    </div>
  )
}

function ManageContent({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ConstructionProjectDetailDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setProject(await getProject(projectId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.")
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleDelete(updateId: string) {
    if (!window.confirm("Xóa cập nhật này (kèm ảnh)? Không khôi phục được.")) return
    try {
      await deleteUpdate(updateId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại.")
    }
  }

  if (error && !project) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="h-4 w-4" />
        {error}
      </div>
    )
  }
  if (!project) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-black dark:text-white md:text-2xl">
          Cập nhật: {project.name}
        </h1>
        <Link href={`/construction/${projectId}`} className="ml-auto text-sm text-primary hover:underline">
          <Eye className="mr-1 inline h-4 w-4" />
          Xem như lãnh đạo
        </Link>
      </header>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Panel title="Đăng cập nhật tiến độ" desc="Ảnh được nén tự động trước khi tải lên.">
        <UpdateForm projectId={projectId} onPosted={reload} />
      </Panel>

      <Panel title="Kế hoạch & tiến độ hạng mục">
        <MilestoneEditor
          key={project.milestones.map((m) => m.id).join(",")}
          projectId={projectId}
          initial={project.milestones}
          onSaved={reload}
        />
      </Panel>

      <Panel title="Dự toán chi phí">
        <CostEditor
          key={project.costItems.map((c) => c.id).join(",")}
          projectId={projectId}
          initial={project.costItems}
          onSaved={reload}
        />
      </Panel>

      <Panel title="Tài liệu (bản vẽ, dự toán)" desc="PDF, Excel, Word, CSV — tối đa 25MB.">
        <FileUploader projectId={projectId} onUploaded={reload} />
      </Panel>

      <Panel title="Các cập nhật đã đăng">
        <UpdateFeed updates={project.updates} onDelete={handleDelete} />
      </Panel>
    </div>
  )
}

function FileUploader({ projectId, onUploaded }: { projectId: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<"PLAN" | "BUDGET" | "OTHER">("PLAN")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await uploadFile(projectId, file, kind)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lên thất bại.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        className="rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 text-sm dark:border-gray-700"
      >
        <option value="PLAN">Bản vẽ / kế hoạch</option>
        <option value="BUDGET">Dự toán</option>
        <option value="OTHER">Khác</option>
      </select>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn-secondary text-sm disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Đang tải…" : "Chọn tài liệu"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xls,.xlsx,.doc,.docx,.csv"
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  )
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
      <h2 className="text-base font-semibold text-black dark:text-white">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-xs text-gray-500">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </section>
  )
}
