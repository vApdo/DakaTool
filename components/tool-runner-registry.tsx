import type { ComponentType } from "react"
import type { Tool } from "@/lib/types"
import { ToolRunner } from "./tool-runner"
import { HblPdfExtractorRunner } from "./hbl/hbl-pdf-extractor-runner"
import { PdfMergeRunner } from "./pdf/pdf-merge-runner"
import { PdfSplitRunner } from "./pdf/pdf-split-runner"
import { PdfOrganizeRunner } from "./pdf/pdf-organize-runner"
import { ImagesToPdfRunner } from "./pdf/images-to-pdf-runner"
import { PdfToImagesRunner } from "./pdf/pdf-to-images-runner"
import { PdfWatermarkRunner } from "./pdf/pdf-watermark-runner"
import { PdfPageNumbersRunner } from "./pdf/pdf-page-numbers-runner"
import { PdfSignRunner } from "./pdf/pdf-sign-runner"

/**
 * Registry ánh xạ tool id → runner component.
 * - Tool có runner thật đăng ký ở đây (mỗi tool một component riêng).
 * - Tool chưa có runner thật dùng ToolRunner mô phỏng (mặc định).
 */
const toolRunnerRegistry: Record<string, ComponentType<{ tool: Tool }>> = {
  "hbl-pdf-extractor": HblPdfExtractorRunner,
  "pdf-merge": PdfMergeRunner,
  "pdf-splitter": PdfSplitRunner,
  "pdf-organize": PdfOrganizeRunner,
  "images-to-pdf": ImagesToPdfRunner,
  "pdf-to-images": PdfToImagesRunner,
  "pdf-watermark": PdfWatermarkRunner,
  "pdf-page-numbers": PdfPageNumbersRunner,
  "pdf-sign": PdfSignRunner,
}

export function getToolRunner(toolId: string): ComponentType<{ tool: Tool }> {
  return toolRunnerRegistry[toolId] ?? ToolRunner
}

/** Tool có runner thật thì trang chi tiết dùng layout toàn chiều rộng. */
export function hasCustomRunner(toolId: string): boolean {
  return toolId in toolRunnerRegistry
}

/** Danh sách tool id có runner thật — để test giữ registry đồng bộ với status trong lib/data. */
export function getCustomRunnerToolIds(): string[] {
  return Object.keys(toolRunnerRegistry)
}
