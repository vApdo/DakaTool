"use client"

import type { PageText, PositionedItem } from "./types"
import { registerOcrProvider, type OcrProvider, type OcrRequest } from "./ocr-provider"

/** Lỗi hủy OCR — runner nhận biết để hiển thị "đã hủy" thay vì "lỗi". */
export class OcrAbortError extends Error {
  constructor() {
    super("OCR đã bị hủy")
    this.name = "AbortError"
  }
}

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

  async recognize(request: OcrRequest, onProgress?: (progress: number) => void): Promise<PageText[]> {
    const { pageCount, scale, renderPage, signal } = request
    const { createWorker } = await import("tesseract.js")

    const throwIfAborted = () => {
      if (signal?.aborted) throw new OcrAbortError()
    }

    let currentPage = 0
    const worker = await createWorker("eng", 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && onProgress) {
          onProgress((currentPage + m.progress) / pageCount)
        }
      },
    })

    // Confidence dưới ngưỡng này → khả năng cao bản scan bị đặt ngược/nghiêng.
    const LOW_CONFIDENCE = 45

    try {
      const result: PageText[] = []
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        throwIfAborted()
        // Render + OCR TỪNG trang rồi bỏ ngay ảnh — chỉ một trang trong RAM mỗi lúc.
        const rendered = await renderPage(pageNumber, 0)
        let best = await recognizeImage(worker, rendered.blob, rendered.heightPx, scale)

        // Bản scan hay bị lộn ngược (180°) hoặc nằm ngang (90/270°):
        // thử lại các góc xoay và giữ kết quả có confidence cao nhất.
        if (best.confidence < LOW_CONFIDENCE) {
          for (const rotation of [180, 90, 270]) {
            throwIfAborted()
            const rotated = await renderPage(pageNumber, rotation)
            const attempt = await recognizeImage(worker, rotated.blob, rotated.heightPx, scale)
            if (attempt.confidence > best.confidence) best = attempt
            if (best.confidence >= LOW_CONFIDENCE) break
          }
        }

        result.push({ pageNumber, items: best.items })
        currentPage++
        onProgress?.(currentPage / pageCount)
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
