import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { classifyPdf } from "@/lib/pdf/classify-pdf"
import { extractHbl } from "@/lib/pdf/extract-hbl"
import type { HblExtractionResult, PageText } from "@/lib/pdf/types"

/**
 * Đọc PDF fixture trong Node bằng bản legacy của pdf.js
 * (bản browser cần DOM API), trả về cùng cấu trúc PageText[] mà
 * extract-text.ts tạo ra trong trình duyệt.
 */
async function loadFixture(name: string): Promise<PageText[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const data = new Uint8Array(readFileSync(join(__dirname, "..", "fixtures", name)))
  const loadingTask = getDocument({ data })
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
  await loadingTask.destroy()
  return pages
}

describe("PDF HBL có text layer (BL_HK-LHKHTD2606444)", () => {
  let result: HblExtractionResult
  let pages: PageText[]

  beforeAll(async () => {
    pages = await loadFixture("BL_HK-LHKHTD2606444 (1).pdf")
    result = extractHbl(pages)
  })

  it("được phân loại là PDF text", () => {
    expect(classifyPdf(pages).kind).toBe("text")
  })

  it("trích xuất đúng các trường tối thiểu", () => {
    expect(result.hblNo.value).toBe("LHKHTD2606444")
    expect(result.shipper.value).toContain("GEBRUDER WEISS HONG KONG LIMITED O/B OF DAVIES TURNER & CO LTD")
    expect(result.consignee.value).toContain("GEBRUDER WEISS K.K.")
    expect(result.notifyParty.value).toBe("SAME AS CONSIGNEE")
    expect(result.vessel.value).toBe("WAN HAI 295")
    expect(result.voyageNo.value).toBe("N067")
    expect(result.portOfLoading.value).toBe("HONGKONG")
    expect(result.portOfDischarge.value).toBe("HAKATA")
    expect(result.containerNo.value).toBe("WHSU8729485")
    expect(result.containerType.value).toBe("40'HQ")
    expect(result.sealNo.value).toBe("WHLY064496")
    expect(result.packages.value).toBe("2")
    expect(result.packageType.value).toBe("SKIDS")
    expect(result.grossWeight.value).toBe("140.000 KGS")
    expect(result.cbm.value).toBe("2.6110 CBM")
    expect(result.releaseType.value).toBe("SURRENDER")
    expect(result.freightType.value).toBe("PREPAID")
    expect(result.shippedOnBoardDate.value).toBe("28-JUN-2026")
  })

  it("lấy được HS Code từ mô tả hàng", () => {
    expect(result.hsCode.value).toBe("90318080")
  })
})

describe("PDF scan không có text layer (BP-70C65)", () => {
  it("được phân loại là scan (cần OCR)", async () => {
    const pages = await loadFixture("BP-70C65_20260710_131643.pdf")
    const classification = classifyPdf(pages)
    expect(classification.kind).toBe("scan")
    expect(classification.pageCount).toBe(10)
  })
})
