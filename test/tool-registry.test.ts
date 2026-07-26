import { describe, expect, it } from "vitest"
import { tools, getToolById } from "@/lib/data"
import { getCustomRunnerToolIds, hasCustomRunner } from "@/components/tool-runner-registry"

/**
 * Khái niệm "tool có runner thật" được khai ở HAI nơi phải đồng bộ tay:
 * trường status trong lib/data.ts và tập key của tool-runner-registry.
 * Test này giữ bất biến đó — thêm runner mà quên đổi status (hoặc ngược lại) sẽ đỏ ngay.
 */
describe("đồng bộ status tool ↔ registry runner", () => {
  it("mọi tool status 'active' đều có runner thật trong registry", () => {
    const missing = tools.filter((t) => t.status === "active" && !hasCustomRunner(t.id)).map((t) => t.id)
    expect(missing).toEqual([])
  })

  it("mọi runner trong registry đều trỏ tới tool tồn tại và mang status 'active'", () => {
    for (const id of getCustomRunnerToolIds()) {
      const tool = getToolById(id)
      expect(tool, `registry chứa id "${id}" không có trong lib/data.ts`).toBeDefined()
      expect(tool?.status, `tool "${id}" có runner thật nhưng status không phải "active"`).toBe("active")
    }
  })
})
