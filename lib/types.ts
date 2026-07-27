export type ToolCategory = "PDF" | "Chứng từ" | "Video & Content"

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
  inputs: ToolInput[]
  tags: string[]
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
