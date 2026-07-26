import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    // Test chỉ chạy logic thuần (calc, money, guard fees.json) — không cần jsdom.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
