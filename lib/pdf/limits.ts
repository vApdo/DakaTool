/**
 * Giới hạn tài nguyên dùng chung cho các tool PDF (client-side).
 * Mục tiêu: tránh treo trình duyệt / hết RAM khi người dùng chọn quá nhiều
 * hoặc file quá lớn, đặc biệt trên điện thoại. File vẫn xử lý hoàn toàn trên máy.
 */

export const PDF_LIMITS = {
  /** Số file tối đa cho một lần xử lý. */
  maxFiles: 20,
  /** Dung lượng tối đa cho MỘT file. */
  maxSingleBytes: 20 * 1024 * 1024, // 20 MB
  /** Tổng dung lượng tối đa trên máy tính. */
  maxTotalBytesDesktop: 100 * 1024 * 1024, // 100 MB
  /** Tổng dung lượng tối đa trên thiết bị di động (thấp hơn để đỡ hết RAM). */
  maxTotalBytesMobile: 40 * 1024 * 1024, // 40 MB
  /** Số trang tối đa xử lý bằng OCR mặc định (OCR rất tốn RAM/CPU). */
  ocrMaxPages: 20,
} as const

/** Đoán thiết bị di động / ít RAM để hạ giới hạn cho an toàn. */
export function isLimitedDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)
  // deviceMemory (Chrome) tính bằng GB; <=4GB coi là hạn chế.
  const lowMemory = typeof (navigator as { deviceMemory?: number }).deviceMemory === "number"
    && (navigator as { deviceMemory?: number }).deviceMemory! <= 4
  return mobileUa || lowMemory
}

/** Giới hạn tổng dung lượng áp dụng cho thiết bị hiện tại. */
export function maxTotalBytesForDevice(): number {
  return isLimitedDevice() ? PDF_LIMITS.maxTotalBytesMobile : PDF_LIMITS.maxTotalBytesDesktop
}

/** Định dạng dung lượng dễ đọc: 1.2 MB, 850 KB. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Một file có khớp danh sách định dạng chấp nhận không (theo MIME HOẶC phần mở rộng). */
export function fileMatchesAccept(file: File, accept: string): boolean {
  const list = accept.split(",").map((a) => a.trim().toLowerCase())
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return list.some((a) =>
    a.startsWith(".")
      ? name.endsWith(a) // theo phần mở rộng — không chỉ dựa vào MIME
      : a.endsWith("/*")
        ? type.startsWith(a.slice(0, -1))
        : type === a,
  )
}

export interface PdfFilesValidation {
  ok: boolean
  /** Lý do không hợp lệ (tiếng Việt), nếu có. */
  error?: string
  fileCount: number
  totalBytes: number
  /** Giới hạn tổng dung lượng đang áp dụng (đổi theo thiết bị). */
  maxTotalBytes: number
}

/**
 * Kiểm tra danh sách file cho tool PDF: định dạng, dung lượng từng file,
 * số lượng file và tổng dung lượng (giới hạn thấp hơn trên di động).
 */
export function validatePdfFiles(
  files: File[],
  options: { accept: string; multiple: boolean },
): PdfFilesValidation {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
  const maxTotalBytes = maxTotalBytesForDevice()
  const base: PdfFilesValidation = {
    ok: true,
    fileCount: files.length,
    totalBytes,
    maxTotalBytes,
  }

  const wrong = files.find((f) => !fileMatchesAccept(f, options.accept))
  if (wrong) {
    return { ...base, ok: false, error: `File "${wrong.name}" không đúng định dạng cho tool này.` }
  }

  if (!options.multiple && files.length > 1) {
    return { ...base, ok: false, error: "Tool này chỉ nhận một file mỗi lần." }
  }

  if (files.length > PDF_LIMITS.maxFiles) {
    return {
      ...base,
      ok: false,
      error: `Tối đa ${PDF_LIMITS.maxFiles} file mỗi lần. Bạn đang chọn ${files.length} file.`,
    }
  }

  const tooBig = files.find((f) => f.size > PDF_LIMITS.maxSingleBytes)
  if (tooBig) {
    return {
      ...base,
      ok: false,
      error: `File "${tooBig.name}" (${formatBytes(tooBig.size)}) vượt quá ${formatBytes(
        PDF_LIMITS.maxSingleBytes,
      )} cho một file.`,
    }
  }

  if (totalBytes > maxTotalBytes) {
    return {
      ...base,
      ok: false,
      error: `Tổng dung lượng ${formatBytes(totalBytes)} vượt quá giới hạn ${formatBytes(
        maxTotalBytes,
      )}${isLimitedDevice() ? " trên thiết bị di động" : ""}. Hãy bớt file hoặc chia thành nhiều lần.`,
    }
  }

  return base
}
