"use client"

import { useState } from "react"

/**
 * Ảnh đại diện Fanpage lấy thẳng từ Facebook (link công khai, không cần token);
 * không tải được thì hiện chữ cái đầu trên nền xanh Facebook.
 */
export function PageAvatar({ pageId, name, size = 40 }: { pageId?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) }
  if (pageId && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện từ graph.facebook.com
      <img
        src={`https://graph.facebook.com/${encodeURIComponent(pageId)}/picture?type=square&width=${size * 2}&height=${size * 2}`}
        alt=""
        style={style}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-[#E4E6EB] object-cover dark:bg-[#3A3B3C]"
      />
    )
  }
  return (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-[#1877F2] font-bold text-white" aria-hidden>
      {(name.trim() || "F").charAt(0).toUpperCase()}
    </span>
  )
}
