/**
 * Nén ảnh phía TRÌNH DUYỆT trước khi upload (canvas): thu về cạnh dài tối đa
 * 1920px, xuất JPEG chất lượng 0.85. Ảnh công trình chụp điện thoại 5–12MB
 * thường còn < 1MB — upload nhanh, đỡ tốn đĩa.
 */
export const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.85

export async function compressImage(file: File): Promise<File> {
  // File không phải ảnh hoặc trình duyệt không hỗ trợ → trả nguyên bản.
  if (!file.type.startsWith("image/")) return file
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))

    // Ảnh đã nhỏ và là JPEG → giữ nguyên.
    if (scale === 1 && file.type === "image/jpeg" && file.size < 1_500_000) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    )
    if (!blob) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg" })
  } catch {
    return file // lỗi gì cũng không chặn upload — gửi ảnh gốc
  }
}
