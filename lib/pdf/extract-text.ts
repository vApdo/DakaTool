"use client"

import type { PageText } from "./types"

/**
 * Đọc text layer của PDF trong TRÌNH DUYỆT bằng pdfjs-dist.
 * File được xử lý hoàn toàn client-side, không gửi đi đâu.
 *
 * pdfjs được import động để:
 * - không bị bundle vào server render (pdf.js cần DOM API),
 * - chỉ tải khi người dùng thực sự mở tool PDF.
 * Worker được bundle nội bộ qua new URL(...) — không dùng CDN ngoài.
 */

export interface LoadedPdf {
  pageCount: number
  pages: PageText[]
  /** Render một trang ra canvas để xem trước. Trả về kích thước đã render. */
  renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    options: { scale: number; rotation: number },
  ): Promise<void>
  destroy(): Promise<void>
}

export async function loadPdf(data: ArrayBuffer): Promise<LoadedPdf> {
  const pdfjs = await import("pdfjs-dist")
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    // Worker dạng ES module để webpack bundle nội bộ (không tải từ CDN).
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    )
  }

  const loadingTask = pdfjs.getDocument({
    data,
    // Bộ giải mã ảnh JBIG2/JPEG2000 (PDF scan hay dùng) và font chuẩn — tự host, không CDN.
    wasmUrl: "/pdfjs/wasm/",
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  })
  const doc = await loadingTask.promise

  const pages: PageText[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push({
      pageNumber: i,
      items: content.items.flatMap((item) =>
        "str" in item
          ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }]
          : [],
      ),
    })
  }

  let renderTask: { cancel(): void } | null = null

  return {
    pageCount: doc.numPages,
    pages,
    async renderPage(pageNumber, canvas, { scale, rotation }) {
      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const context = canvas.getContext("2d")
      if (!context) return
      renderTask?.cancel()
      const task = page.render({ canvas, canvasContext: context, viewport })
      renderTask = task
      try {
        await task.promise
      } catch (err) {
        // Render bị hủy khi người dùng chuyển trang nhanh — không phải lỗi thật.
        if ((err as Error)?.name !== "RenderingCancelledException") throw err
      }
    },
    async destroy() {
      renderTask?.cancel()
      await loadingTask.destroy()
    },
  }
}
