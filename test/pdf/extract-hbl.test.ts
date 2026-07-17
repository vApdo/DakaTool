import { beforeAll, describe, expect, it } from "vitest"
import { classifyPdf } from "@/lib/pdf/classify-pdf"
import { extractHbl } from "@/lib/pdf/extract-hbl"
import type { HblExtractionResult, PageText } from "@/lib/pdf/types"
import { SYNTHETIC_HBL, buildHblTextPdf, buildScanPdf, loadPagesFromPdfBytes } from "./fixtures"

/**
 * Test tích hợp pipeline HBL trên fixture GIẢ LẬP (không dùng chứng từ khách):
 *   PDF bytes (pdf-lib) → text layer (pdfjs) → classify-pdf → extract-hbl.
 * Fixture được dựng trong test nên `npm test` chạy được trên repo clone sạch,
 * không cần copy file PDF thủ công.
 */
describe("HBL PDF có text layer (fixture giả lập)", () => {
  let result: HblExtractionResult
  let pages: PageText[]

  beforeAll(async () => {
    pages = await loadPagesFromPdfBytes(await buildHblTextPdf())
    result = extractHbl(pages)
  })

  it("được phân loại là PDF text", () => {
    expect(classifyPdf(pages).kind).toBe("text")
  })

  it("trích xuất đúng số HBL, các bên và tuyến đường", () => {
    expect(result.hblNo.value).toBe(SYNTHETIC_HBL.hblNo)
    expect(result.shipper.value).toContain(SYNTHETIC_HBL.shipper)
    expect(result.consignee.value).toContain(SYNTHETIC_HBL.consignee)
    expect(result.notifyParty.value).toBe(SYNTHETIC_HBL.notifyParty)
    expect(result.vessel.value).toBe(SYNTHETIC_HBL.vessel)
    expect(result.voyageNo.value).toBe(SYNTHETIC_HBL.voyageNo)
    expect(result.portOfLoading.value).toBe(SYNTHETIC_HBL.portOfLoading)
    expect(result.portOfDischarge.value).toBe(SYNTHETIC_HBL.portOfDischarge)
    expect(result.placeOfDelivery.value).toBe(SYNTHETIC_HBL.placeOfDelivery)
  })

  it("tách đúng chuỗi container thành các trường con", () => {
    expect(result.containerNo.value).toBe(SYNTHETIC_HBL.containerNo)
    expect(result.containerType.value).toBe(SYNTHETIC_HBL.containerType)
    expect(result.sealNo.value).toBe(SYNTHETIC_HBL.sealNo)
    expect(result.packages.value).toBe(SYNTHETIC_HBL.packages)
    expect(result.packageType.value).toBe(SYNTHETIC_HBL.packageType)
    expect(result.grossWeight.value).toBe(SYNTHETIC_HBL.grossWeight)
    expect(result.cbm.value).toBe(SYNTHETIC_HBL.cbm)
  })

  it("nhận diện đúng quy tắc nghiệp vụ và ngày/HS", () => {
    expect(result.releaseType.value).toBe(SYNTHETIC_HBL.releaseType)
    expect(result.freightType.value).toBe(SYNTHETIC_HBL.freightType)
    expect(result.shippedOnBoardDate.value).toBe(SYNTHETIC_HBL.shippedOnBoardDate)
    expect(result.hsCode.value).toBe(SYNTHETIC_HBL.hsCode)
  })
})

describe("PDF scan không có text layer (fixture giả lập)", () => {
  it("được phân loại là scan (cần OCR) với đúng số trang", async () => {
    const pages = await loadPagesFromPdfBytes(await buildScanPdf(10))
    const classification = classifyPdf(pages)
    expect(classification.kind).toBe("scan")
    expect(classification.pageCount).toBe(10)
  })
})
