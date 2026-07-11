import type { ComponentType } from "react"
import type { Tool } from "@/lib/types"
import { ToolRunner } from "./tool-runner"
import { HblPdfExtractorRunner } from "./hbl-pdf-extractor-runner"

/**
 * Registry ánh xạ tool id → runner component.
 * - Tool có runner thật đăng ký ở đây (mỗi tool một component riêng).
 * - Tool chưa có runner thật dùng ToolRunner mô phỏng (mặc định).
 */
const toolRunnerRegistry: Record<string, ComponentType<{ tool: Tool }>> = {
  "hbl-pdf-extractor": HblPdfExtractorRunner,
}

export function getToolRunner(toolId: string): ComponentType<{ tool: Tool }> {
  return toolRunnerRegistry[toolId] ?? ToolRunner
}

/** Tool có runner thật thì trang chi tiết dùng layout toàn chiều rộng. */
export function hasCustomRunner(toolId: string): boolean {
  return toolId in toolRunnerRegistry
}
