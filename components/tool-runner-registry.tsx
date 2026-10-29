import type { ComponentType } from "react"
import type { Tool } from "@/lib/types"
import { PaymentRequestRunner } from "./payment-request-runner"

/**
 * Registry ánh xạ tool id → runner component. Mọi tool trong lib/data.ts phải
 * có runner thật ở đây. Không còn runner mô phỏng.
 */
const toolRunnerRegistry: Record<string, ComponentType<{ tool: Tool }>> = {
  "payment-request": PaymentRequestRunner,
}

export function getToolRunner(toolId: string): ComponentType<{ tool: Tool }> | undefined {
  return toolRunnerRegistry[toolId]
}
