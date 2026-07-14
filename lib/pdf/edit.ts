/**
 * Các thao tác chỉnh sửa PDF bằng pdf-lib, chạy hoàn toàn trong trình duyệt
 * (pdf-lib là JS thuần nên cũng chạy được trong test Node).
 * Mỗi hàm nhận bytes vào, trả bytes ra — không giữ trạng thái.
 */

import type { PDFDocument as PDFDocumentType } from "pdf-lib"

async function pdflib() {
  return import("pdf-lib")
}

/** Mở PDF, đổi lỗi mã hóa thành thông báo tiếng Việt dễ hiểu. */
async function openPdf(bytes: Uint8Array): Promise<PDFDocumentType> {
  const { PDFDocument } = await pdflib()
  try {
    return await PDFDocument.load(bytes)
  } catch (err) {
    if (err instanceof Error && /encrypted/i.test(err.message)) {
      throw new Error("File PDF có mật khẩu hoặc bị khóa chỉnh sửa. Hãy gỡ mật khẩu rồi thử lại.")
    }
    throw err
  }
}

/** Ghép nhiều PDF thành một, theo đúng thứ tự truyền vào. */
export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  const { PDFDocument } = await pdflib()
  const out = await PDFDocument.create()
  for (const bytes of files) {
    const src = await openPdf(bytes)
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
  }
  return out.save()
}

/** Tách PDF theo các nhóm chỉ số trang (0-based); mỗi nhóm một file. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const { PDFDocument } = await pdflib()
  const src = await openPdf(bytes)
  const results: Uint8Array[] = []
  for (const group of groups) {
    const out = await PDFDocument.create()
    const pages = await out.copyPages(src, group)
    for (const page of pages) out.addPage(page)
    results.push(await out.save())
  }
  return results
}

export interface PageOp {
  /** Chỉ số trang trong file gốc (0-based). */
  sourceIndex: number
  /** Góc xoay cộng thêm, bội số của 90. */
  extraRotation: number
}

/** Dựng lại PDF theo thứ tự trang mới, kèm xoay và bỏ trang (trang bị bỏ không có trong danh sách). */
export async function reorganizePdf(bytes: Uint8Array, ops: PageOp[]): Promise<Uint8Array> {
  if (ops.length === 0) throw new Error("Phải giữ lại ít nhất một trang.")
  const { PDFDocument, degrees } = await pdflib()
  const src = await openPdf(bytes)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, ops.map((op) => op.sourceIndex))
  pages.forEach((page, i) => {
    const rotation = (page.getRotation().angle + ops[i].extraRotation) % 360
    page.setRotation(degrees(rotation))
    out.addPage(page)
  })
  return out.save()
}

export type ImagePageSize = "a4" | "a4-landscape" | "fit"

export interface ImageInput {
  bytes: Uint8Array
  /** MIME: image/png hoặc image/jpeg. */
  type: string
}

const A4: [number, number] = [595.28, 841.89]

/** Ghép nhiều ảnh (PNG/JPG) thành một PDF, mỗi ảnh một trang. */
export async function imagesToPdf(
  images: ImageInput[],
  options: { pageSize: ImagePageSize; marginPt?: number },
): Promise<Uint8Array> {
  const { PDFDocument } = await pdflib()
  const out = await PDFDocument.create()
  const margin = options.marginPt ?? 24

  for (const image of images) {
    const embedded =
      image.type === "image/png" ? await out.embedPng(image.bytes) : await out.embedJpg(image.bytes)

    if (options.pageSize === "fit") {
      const page = out.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
      continue
    }

    const [w, h] = options.pageSize === "a4" ? A4 : [A4[1], A4[0]]
    const page = out.addPage([w, h])
    const maxW = w - margin * 2
    const maxH = h - margin * 2
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1)
    const drawW = embedded.width * scale
    const drawH = embedded.height * scale
    page.drawImage(embedded, {
      x: (w - drawW) / 2,
      y: (h - drawH) / 2,
      width: drawW,
      height: drawH,
    })
  }
  return out.save()
}

/**
 * Đóng một ảnh PNG (watermark/chữ ký/con dấu) lên PDF.
 * Vị trí tính theo tỷ lệ trang để không phụ thuộc khổ giấy.
 */
export interface StampOptions {
  /** Tâm ảnh theo tỷ lệ chiều rộng trang, 0..1. */
  centerXRatio: number
  /** Tâm ảnh theo tỷ lệ chiều cao trang, 0..1 (0 = mép dưới). */
  centerYRatio: number
  /** Chiều rộng ảnh theo tỷ lệ chiều rộng trang, 0..1. */
  widthRatio: number
  opacity?: number
  /** Trang áp dụng (0-based). Bỏ trống = tất cả các trang. */
  pageIndices?: number[]
}

export async function stampImage(
  bytes: Uint8Array,
  pngBytes: Uint8Array,
  options: StampOptions,
): Promise<Uint8Array> {
  const doc = await openPdf(bytes)
  const embedded = await doc.embedPng(pngBytes)
  const targets = options.pageIndices ?? doc.getPageIndices()
  for (const index of targets) {
    const page = doc.getPage(index)
    const { width, height } = page.getSize()
    const drawW = width * options.widthRatio
    const drawH = drawW * (embedded.height / embedded.width)
    page.drawImage(embedded, {
      x: width * options.centerXRatio - drawW / 2,
      y: height * options.centerYRatio - drawH / 2,
      width: drawW,
      height: drawH,
      opacity: options.opacity ?? 1,
    })
  }
  return doc.save()
}

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left"

export type PageNumberFormat = "n" | "n-of-total" | "trang-n-of-total"

export interface PageNumberOptions {
  position: PageNumberPosition
  format: PageNumberFormat
  startAt: number
  fontSize: number
}

function formatPageLabel(format: PageNumberFormat, n: number, total: number): string {
  switch (format) {
    case "n":
      return String(n)
    case "n-of-total":
      return `${n}/${total}`
    case "trang-n-of-total":
      return `Trang ${n}/${total}`
  }
}

/** Đánh số trang. Nhãn chỉ dùng ký tự ASCII nên font Helvetica chuẩn là đủ. */
export async function addPageNumbers(bytes: Uint8Array, options: PageNumberOptions): Promise<Uint8Array> {
  const { StandardFonts, rgb } = await pdflib()
  const doc = await openPdf(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length
  const margin = 28

  pages.forEach((page, i) => {
    const label = formatPageLabel(options.format, options.startAt + i, total)
    const textWidth = font.widthOfTextAtSize(label, options.fontSize)
    const { width, height } = page.getSize()

    const x = options.position.endsWith("left")
      ? margin
      : options.position.endsWith("right")
        ? width - margin - textWidth
        : (width - textWidth) / 2
    const y = options.position.startsWith("top") ? height - margin : margin - options.fontSize / 2

    page.drawText(label, { x, y, size: options.fontSize, font, color: rgb(0.25, 0.25, 0.25) })
  })
  return doc.save()
}
