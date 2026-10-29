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
