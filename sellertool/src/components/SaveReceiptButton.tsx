import { useState } from "react"
import { toPng } from "html-to-image"

interface SaveReceiptButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
}

/**
 * Xuất biên lai thành ảnh PNG để seller lưu máy / chia sẻ vào group.
 * Chờ document.fonts.ready trước khi chụp — không thì ảnh rơi về font hệ thống.
 */
export function SaveReceiptButton({ targetRef, disabled }: SaveReceiptButtonProps) {
  const [status, setStatus] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const node = targetRef.current
    if (!node || saving) return
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
    // Safari iOS chỉ cho window.open NGAY trong cú chạm (trước mọi await) —
    // mở sẵn cửa sổ rỗng, tạo ảnh xong mới ghi vào; mở muộn là bị chặn popup.
    const iosWindow = isIOS ? window.open("", "_blank") : null
    if (iosWindow) iosWindow.document.write("<p style='font-family:sans-serif'>Đang tạo ảnh phiếu…</p>")
    setSaving(true)
    setStatus("Đang tạo ảnh…")
    try {
      await document.fonts.ready
      const options = {
        pixelRatio: 2,
        backgroundColor: "#12403a",
        cacheBust: true,
        // Bỏ drop-shadow trong ảnh (canvas cắt mất mép bóng trông lem) + thêm viền nền.
        style: { margin: "0", filter: "none", padding: "16px 14px" },
      }
      let dataUrl: string
      // Tắt animation của biên lai trong bản clone — xem ghi chú ở receipt.css.
      node.classList.add("shooting")
      try {
        try {
          dataUrl = await toPng(node, options)
        } catch {
          // Hiếm khi lỗi nhúng font (font đã self-host) — thử lại bỏ qua font.
          dataUrl = await toPng(node, { ...options, skipFonts: true })
        }
      } finally {
        node.classList.remove("shooting")
      }

      const fileName = `phieu-tinh-lai-${new Date().toISOString().slice(0, 10)}.png`
      if (isIOS) {
        // Safari iOS không tin thuộc tính download — ghi ảnh vào cửa sổ đã mở sẵn.
        if (iosWindow) {
          iosWindow.document.open()
          iosWindow.document.write(`<img src="${dataUrl}" style="max-width:100%" alt="Phiếu tính lãi">`)
          iosWindow.document.close()
          setStatus("Nhấn giữ ảnh vừa mở để lưu về máy.")
        } else {
          setStatus("Trình duyệt chặn cửa sổ mới — bạn hãy chụp màn hình giúp mình nhé.")
        }
      } else {
        const link = document.createElement("a")
        link.download = fileName
        link.href = dataUrl
        link.click()
        setStatus("Đã lưu phiếu vào máy.")
      }
    } catch (err) {
      console.error("Xuất PNG lỗi:", err)
      iosWindow?.close()
      setStatus("Không xuất được ảnh — bạn hãy chụp màn hình giúp mình nhé.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button type="button" className="btn-save" onClick={handleSave} disabled={disabled || saving}>
        {saving ? "Đang tạo ảnh…" : "Chụp / Lưu phiếu"}
      </button>
      <span className="save-status" role="status">
        {status}
      </span>
    </div>
  )
}
