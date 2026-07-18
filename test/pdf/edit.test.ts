import { describe, expect, it } from "vitest"
import { PDFDocument, PDFDict, PDFName } from "pdf-lib"
import { parsePageRanges } from "@/lib/pdf/page-ranges"
import {
  addPageNumbers,
  imagesToPdf,
  mergePdfs,
  reorganizePdf,
  splitPdf,
  stampImage,
} from "@/lib/pdf/edit"
import { loadPagesFromPdfBytes } from "./fixtures"

/**
 * Kiểm thử thao tác PDF trên fixture dựng trong test (không dùng chứng từ thật).
 * Mỗi trang nguồn có CHIỀU RỘNG khác nhau để nhận diện trang → kiểm được đúng
 * thứ tự / xóa / xoay, không chỉ đếm số trang.
 */

/** PDF với các trang có chiều rộng cho trước (dùng width làm "mã" nhận diện trang). */
async function makeSizedPdf(widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const w of widths) doc.addPage([w, 400])
  return doc.save()
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => Math.round(p.getWidth()))
}

/** PNG 1x1 đỏ — đủ để test đóng dấu/ảnh→PDF. */
const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
)

/** Trang có tham chiếu ảnh (XObject) không — để kiểm đóng dấu đúng trang. */
function pageHasImage(doc: PDFDocument, pageIndex: number): boolean {
  const res = doc.getPage(pageIndex).node.Resources()
  if (!res) return false
  const xobj = res.lookup(PDFName.of("XObject"))
  return xobj instanceof PDFDict && xobj.keys().length > 0
}

describe("parsePageRanges", () => {
  it("để trống → tách từng trang", () => {
    expect(parsePageRanges("", 3)).toEqual([[0], [1], [2]])
  })

  it("hiểu khoảng và trang lẻ, đổi về chỉ số 0-based", () => {
    expect(parsePageRanges("1-3, 5", 10)).toEqual([[0, 1, 2], [4]])
  })

  it("cho phép trùng lặp (mỗi khoảng là một file)", () => {
    expect(parsePageRanges("1, 1", 3)).toEqual([[0], [0]])
  })

  it("báo lỗi khi vượt số trang, sai cú pháp, hoặc đảo ngược", () => {
    expect(() => parsePageRanges("1-99", 5)).toThrow(/ngoài số trang/)
    expect(() => parsePageRanges("abc", 5)).toThrow(/Không hiểu/)
    expect(() => parsePageRanges("0", 5)).toThrow(/ngoài số trang/)
    expect(() => parsePageRanges("4-2", 5)).toThrow(/lớn hơn/)
  })
})

describe("mergePdfs", () => {
  it("ghép đúng thứ tự các trang của từng file", async () => {
    const a = await makeSizedPdf([110, 111])
    const b = await makeSizedPdf([200, 201, 202])
    const merged = await mergePdfs([a, b])
    expect(await pageWidths(merged)).toEqual([110, 111, 200, 201, 202])
  })

  it("từ chối dữ liệu không phải PDF hợp lệ", async () => {
    await expect(mergePdfs([Uint8Array.from([1, 2, 3, 4, 5])])).rejects.toThrow()
  })
})

describe("splitPdf", () => {
  it("tách đúng các trang theo từng nhóm", async () => {
    const src = await makeSizedPdf([110, 111, 112, 113])
    const parts = await splitPdf(src, [[0, 1], [3]])
    expect(parts).toHaveLength(2)
    expect(await pageWidths(parts[0])).toEqual([110, 111])
    expect(await pageWidths(parts[1])).toEqual([113])
  })
})

describe("reorganizePdf", () => {
  it("đổi thứ tự, xóa trang bị bỏ và xoay đúng trang", async () => {
    const src = await makeSizedPdf([110, 111, 112])
    const result = await reorganizePdf(src, [
      { sourceIndex: 2, extraRotation: 90 },
      { sourceIndex: 0, extraRotation: 0 },
    ])
    const doc = await PDFDocument.load(result)
    // Trang 111 (index 1) bị bỏ; thứ tự mới là [112, 110].
    expect(doc.getPages().map((p) => Math.round(p.getWidth()))).toEqual([112, 110])
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect(doc.getPage(1).getRotation().angle).toBe(0)
  })

  it("báo lỗi khi không giữ trang nào", async () => {
    const src = await makeSizedPdf([110])
    await expect(reorganizePdf(src, [])).rejects.toThrow(/ít nhất một trang/)
  })
})

describe("stampImage", () => {
  it("chỉ đóng ảnh lên trang được chọn", async () => {
    const src = await makeSizedPdf([110, 111, 112])
    const result = await stampImage(src, TINY_PNG, {
      centerXRatio: 0.5,
      centerYRatio: 0.5,
      widthRatio: 0.3,
      pageIndices: [1],
    })
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
    expect(pageHasImage(doc, 0)).toBe(false)
    expect(pageHasImage(doc, 1)).toBe(true)
    expect(pageHasImage(doc, 2)).toBe(false)
  })
})

describe("addPageNumbers", () => {
  it("thực sự chèn nội dung số trang đọc lại được", async () => {
    const src = await makeSizedPdf([300, 300])
    const result = await addPageNumbers(src, {
      position: "bottom-center",
      format: "n-of-total",
      startAt: 1,
      fontSize: 11,
    })
    const pages = await loadPagesFromPdfBytes(result)
    const textOf = (i: number) => pages[i].items.map((it) => it.text).join(" ")
    expect(textOf(0)).toContain("1/2")
    expect(textOf(1)).toContain("2/2")
  })
})

describe("imagesToPdf", () => {
  it("mỗi ảnh một trang, khổ A4", async () => {
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

  it("khổ 'fit' → trang đúng bằng kích thước ảnh", async () => {
    const result = await imagesToPdf([{ bytes: TINY_PNG, type: "image/png" }], { pageSize: "fit" })
    const doc = await PDFDocument.load(result)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(1)
    expect(Math.round(doc.getPage(0).getHeight())).toBe(1)
  })
})
