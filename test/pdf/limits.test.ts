import { describe, expect, it } from "vitest"
import { PDF_LIMITS, fileMatchesAccept, formatBytes, validatePdfFiles } from "@/lib/pdf/limits"

const PDF_ACCEPT = "application/pdf,.pdf"

/**
 * Tạo File với size tùy ý mà không cấp phát bộ nhớ thật —
 * validatePdfFiles chỉ đọc name/type/size nên override size là đủ.
 */
function fakeFile(name: string, type: string, size = 1024): File {
  const file = new File([new Uint8Array(0)], name, { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

const MB = 1024 * 1024

describe("formatBytes", () => {
  it("hiển thị MB với một chữ số thập phân", () => {
    expect(formatBytes(1 * MB)).toBe("1.0 MB")
    expect(formatBytes(1.5 * MB)).toBe("1.5 MB")
    expect(formatBytes(PDF_LIMITS.maxSingleBytes)).toBe("20.0 MB")
  })

  it("hiển thị KB dưới ngưỡng 1MB, tối thiểu 1 KB", () => {
    expect(formatBytes(850 * 1024)).toBe("850 KB")
    expect(formatBytes(500)).toBe("1 KB") // không hiển thị "0 KB" cho file rất nhỏ
  })
})

describe("fileMatchesAccept", () => {
  it("khớp theo phần mở rộng kể cả khi MIME sai/thiếu", () => {
    expect(fileMatchesAccept(fakeFile("don-hang.pdf", ""), PDF_ACCEPT)).toBe(true)
    expect(fileMatchesAccept(fakeFile("DON-HANG.PDF", "application/octet-stream"), PDF_ACCEPT)).toBe(true)
  })

  it("khớp theo MIME chính xác kể cả khi tên file không có đuôi chuẩn", () => {
    expect(fileMatchesAccept(fakeFile("taixuong", "application/pdf"), PDF_ACCEPT)).toBe(true)
  })

  it("khớp pattern dạng type/* cho nhóm MIME", () => {
    expect(fileMatchesAccept(fakeFile("anh.png", "image/png"), "image/*")).toBe(true)
    expect(fileMatchesAccept(fakeFile("anh.jpg", "image/jpeg"), "image/*")).toBe(true)
    expect(fileMatchesAccept(fakeFile("tailieu.pdf", "application/pdf"), "image/*")).toBe(false)
  })

  it("từ chối file không khớp cả MIME lẫn phần mở rộng", () => {
    expect(fileMatchesAccept(fakeFile("ghi-chu.txt", "text/plain"), PDF_ACCEPT)).toBe(false)
  })
})

describe("validatePdfFiles", () => {
  it("chấp nhận bộ file hợp lệ và trả về thống kê đúng", () => {
    const files = [fakeFile("a.pdf", "application/pdf", 2 * MB), fakeFile("b.pdf", "application/pdf", 3 * MB)]
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: true })
    expect(check.ok).toBe(true)
    expect(check.error).toBeUndefined()
    expect(check.fileCount).toBe(2)
    expect(check.totalBytes).toBe(5 * MB)
  })

  it("báo lỗi định dạng, và lỗi này được ưu tiên trước các lỗi khác", () => {
    // File vừa sai định dạng vừa vượt dung lượng → phải báo lỗi định dạng trước.
    const files = [fakeFile("virus.exe", "application/octet-stream", 50 * MB)]
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: false })
    expect(check.ok).toBe(false)
    expect(check.error).toContain("không đúng định dạng")
  })

  it("chặn nhiều file khi tool chỉ nhận một file", () => {
    const files = [fakeFile("a.pdf", "application/pdf"), fakeFile("b.pdf", "application/pdf")]
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: false })
    expect(check.ok).toBe(false)
    expect(check.error).toContain("một file")
  })

  it("chặn vượt số file tối đa", () => {
    const files = Array.from({ length: PDF_LIMITS.maxFiles + 1 }, (_, i) =>
      fakeFile(`f${i}.pdf`, "application/pdf"),
    )
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: true })
    expect(check.ok).toBe(false)
    expect(check.error).toContain(`Tối đa ${PDF_LIMITS.maxFiles} file`)
  })

  it("chặn một file vượt dung lượng đơn lẻ", () => {
    const files = [fakeFile("to.pdf", "application/pdf", PDF_LIMITS.maxSingleBytes + 1)]
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: false })
    expect(check.ok).toBe(false)
    expect(check.error).toContain("vượt quá")
  })

  it("chặn vượt tổng dung lượng (môi trường Node không có navigator → giới hạn desktop)", () => {
    // 6 file × 18MB = 108MB > 100MB desktop, từng file vẫn dưới 20MB.
    const files = Array.from({ length: 6 }, (_, i) => fakeFile(`f${i}.pdf`, "application/pdf", 18 * MB))
    const check = validatePdfFiles(files, { accept: PDF_ACCEPT, multiple: true })
    expect(check.maxTotalBytes).toBe(PDF_LIMITS.maxTotalBytesDesktop)
    expect(check.ok).toBe(false)
    expect(check.error).toContain("Tổng dung lượng")
  })
})
