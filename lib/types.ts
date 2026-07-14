export type ToolCategory = "PDF" | "File" | "Dữ liệu" | "Email" | "Web" | "Báo cáo" | "Chứng từ"

export type ToolStatus = "active" | "draft"

export type ToolInputType = "text" | "textarea" | "number" | "select" | "file"

export interface ToolInput {
  name: string
  label: string
  type: ToolInputType
  placeholder?: string
  options?: string[]
  required?: boolean
}

export interface Tool {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  status: ToolStatus
  runsCount: number
  lastRunAt: string | null
  inputs: ToolInput[]
  tags: string[]
}

export interface Template {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  steps: string[]
}

export type RunStatus = "success" | "failed" | "running"

export interface RunRecord {
  id: string
  toolId: string
  toolName: string
  status: RunStatus
  startedAt: string
  durationSeconds: number | null
  summary: string
  runBy: string
}
