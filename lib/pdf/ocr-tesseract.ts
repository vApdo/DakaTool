"use client"

import type { PageText, PositionedItem } from "./types"
import { registerOcrProvider, type OcrPageImage, type OcrProvider } from "./ocr-provider"

/**
 * OCR provider chạy trong trình duyệt bằng Tesseract.js.
 * Toàn bộ asset (worker, WASM core, model tiếng Anh) tự host tại /public/ocr
 * — không CDN ngoài, ảnh chứng từ không rời khỏi máy người dùng.
 *
 * Tọa độ: Tesseract trả bbox theo pixel, gốc GÓC TRÁI TRÊN của ảnh;
 * pipeline HBL dùng đơn vị PDF, gốc GÓC TRÁI DƯỚI → quy đổi:
 *   x_pdf = x0 / scale;  y_pdf = (heightPx - y1) / scale
 */
export const tesseractOcrProvider: OcrProvider = {
  id: "tesseract-js",
  name: "Tesseract.js (trong trình duyệt)",
  runsInBrowser: true,

  async recognize(pages: OcrPageImage[], onProgress?: (progress: number) => void): Promise<PageText[]> {
    const { createWorker } = await import("tesseract.js")

    let currentPage = 0
    const worker = await createWorker("eng", 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress((currentPage + m.progress) / pages.length)
        }
      },
    })

    // Confidence dưới ngưỡng này → khả năng cao bản scan bị đặt ngược/nghiêng.
    const LOW_CONFIDENCE = 45

    try {
      const result: PageText[] = []
      for (const page of pages) {
        let best = await recognizeImage(worker, page.blob, page.heightPx, page.scale)

        // Bản scan hay bị lộn ngược (180°) hoặc nằm ngang (90/270°):
        // thử lại các góc xoay và giữ kết quả có confidence cao nhất.
        if (best.confidence < LOW_CONFIDENCE && page.render) {
          for (const rotation of [180, 90, 270]) {
            const rotated = await page.render(rotation)
            const attempt = await recognizeImage(worker, rotated.blob, rotated.heightPx, page.scale)
            if (attempt.confidence > best.confidence) best = attempt
            if (best.confidence >= LOW_CONFIDENCE) break
          }
        }

        result.push({ pageNumber: page.pageNumber, items: best.items })
        currentPage++
        onProgress?.(currentPage / pages.length)
      }
      return result
    } finally {
      await worker.terminate()
    }
  },
}

interface RecognizedPage {
  items: PositionedItem[]
  /** Confidence trung bình 0–100 do Tesseract báo. */
  confidence: number
}

type TesseractWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>

async function recognizeImage(
  worker: TesseractWorker,
  blob: Blob,
  heightPx: number,
  scale: number,
): Promise<RecognizedPage> {
  const { data } = await worker.recognize(blob, {}, { blocks: true })
  const items: PositionedItem[] = []
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const text = line.text.replace(/\n/g, " ").trim()
        if (!text) continue
        items.push({
          text,
          x: line.bbox.x0 / scale,
          y: (heightPx - line.bbox.y1) / scale,
          width: (line.bbox.x1 - line.bbox.x0) / scale,
        })
      }
    }
  }
  return { items, confidence: data.confidence ?? 0 }
}

registerOcrProvider(tesseractOcrProvider)
