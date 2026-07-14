import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { parsePageRanges } from "@/lib/pdf/page-ranges"
import {
  addPageNumbers,
  imagesToPdf,
  mergePdfs,
  reorganizePdf,
  splitPdf,
  stampImage,
} from "@/lib/pdf/edit"

/** Tạo PDF n trang trong bộ nhớ để test. */
async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([595, 842])
  return doc.save()
}

// PNG 1x1 pixel đỏ, đủ cho test stamp.
const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
)

describe("parsePageRanges", () => {
  it("để trống thì tách từng trang", () => {
    expect(parsePageRanges("", 3)).toEqual([[0], [1], [2]])
  })

  it("hiểu khoảng và trang lẻ, đổi về chỉ số 0-based", () => {
    expect(parsePageRanges("1-3, 5", 10)).toEqual([[0, 1, 2], [4]])
  })

  it("báo lỗi khi vượt số trang hoặc sai cú pháp", () => {
    expect(() => parsePageRanges("1-99", 5)).toThrow(/ngoài số trang/)
    expect(() => parsePageRanges("abc", 5)).toThrow(/Không hiểu/)
    expect(() => parsePageRanges("4-2", 5)).toThrow(/lớn hơn/)
  })
})

describe("thao tác pdf-lib", () => {
  it("mergePdfs ghép đủ trang theo thứ tự", async () => {
    const merged = await mergePdfs([await makePdf(2), await makePdf(3)])
    const doc = await PDFDocument.load(merged)
    expect(doc.getPageCount()).toBe(5)
  })

  it("splitPdf tách theo nhóm", async () => {
    const parts = await splitPdf(await makePdf(4), [[0, 1], [3]])
    expect(parts).toHaveLength(2)
    expect((await PDFDocument.load(parts[0])).getPageCount()).toBe(2)
    expect((await PDFDocument.load(parts[1])).getPageCount()).toBe(1)
  })

  it("reorganizePdf đảo thứ tự, bỏ trang và xoay", async () => {
    const result = await reorganizePdf(await makePdf(3), [
      { sourceIndex: 2, extraRotation: 90 },
      { sourceIndex: 0, extraRotation: 0 },
    ])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  })

  it("imagesToPdf tạo mỗi ảnh một trang A4", async () => {
    const result = await imagesToPdf(
      [
        { bytes: TINY_PNG, type: "image/png" },
        { bytes: TINY_PNG, type: "image/png" },
      ],
      { pageSize: "a4" },
    )
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(2)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595)
  })

  it("stampImage chỉ đóng lên trang được chọn", async () => {
    const result = await stampImage(await makePdf(3), TINY_PNG, {
      centerXRatio: 0.5,
      centerYRatio: 0.5,
      widthRatio: 0.3,
      pageIndices: [1],
    })
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it("addPageNumbers giữ nguyên số trang và chạy đủ các kiểu", async () => {
    const result = await addPageNumbers(await makePdf(2), {
      position: "bottom-center",
      format: "trang-n-of-total",
      startAt: 1,
      fontSize: 11,
    })
    expect((await PDFDocument.load(result)).getPageCount()).toBe(2)
  })
})
