import type { ComponentType } from "react"
import type { Tool } from "@/lib/types"
import { HblPdfExtractorRunner } from "./hbl-pdf-extractor-runner"
import { PdfMergeRunner } from "./pdf/pdf-merge-runner"
import { PdfSplitRunner } from "./pdf/pdf-split-runner"
import { PdfOrganizeRunner } from "./pdf/pdf-organize-runner"
import { ImagesToPdfRunner } from "./pdf/images-to-pdf-runner"
import { PdfToImagesRunner } from "./pdf/pdf-to-images-runner"
import { PdfWatermarkRunner } from "./pdf/pdf-watermark-runner"
import { PdfPageNumbersRunner } from "./pdf/pdf-page-numbers-runner"
import { PdfSignRunner } from "./pdf/pdf-sign-runner"
import { PaymentRequestRunner } from "./payment-request-runner"

/**
 * Registry ánh xạ tool id → runner component. Mọi tool trong lib/data.ts phải
 * có runner thật ở đây. Không còn runner mô phỏng.
 */
const toolRunnerRegistry: Record<string, ComponentType<{ tool: Tool }>> = {
  "payment-request": PaymentRequestRunner,
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

export function getToolRunner(toolId: string): ComponentType<{ tool: Tool }> | undefined {
  return toolRunnerRegistry[toolId]
}
