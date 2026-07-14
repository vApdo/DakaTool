"use client"

/** Tải một file về máy người dùng ngay trong trình duyệt. */
export function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  // Trì hoãn revoke để Safari kịp bắt đầu tải.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadBytes(fileName: string, bytes: Uint8Array, mime: string) {
  downloadBlob(fileName, new Blob([bytes as BlobPart], { type: mime }))
}

/** Gói nhiều file thành một ZIP rồi tải về. jszip chỉ được nạp khi cần. */
export async function downloadAsZip(
  zipName: string,
  files: { name: string; data: Uint8Array | Blob }[],
) {
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()
  for (const file of files) zip.file(file.name, file.data)
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(zipName, blob)
}

/** Bỏ đuôi mở rộng của tên file để ghép tên file kết quả. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "")
}
