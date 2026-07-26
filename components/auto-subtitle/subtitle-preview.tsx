"use client"

import { forwardRef } from "react"
import type { SegmentDTO, SubtitleStyle } from "@/lib/auto-subtitle/types"

/** Chuyển hex + opacity → rgba cho preview CSS. */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface Props {
  videoUrl: string
  style: SubtitleStyle
  activeSegment: SegmentDTO | null
  onTimeUpdate: (ms: number) => void
}

/**
 * Preview video + overlay phụ đề bằng CSS (gần đúng ASS render). Không phải bản
 * ghép cứng — chỉ để xem trước nhanh khi chỉnh style/nội dung.
 */
export const SubtitlePreview = forwardRef<HTMLVideoElement, Props>(function SubtitlePreview(
  { videoUrl, style, activeSegment, onTimeUpdate },
  ref,
) {
  const align =
    style.position === "top" ? "flex-start" : style.position === "middle" ? "center" : "flex-end"

  const textShadow = Array.from({ length: 4 })
    .map((_, i) => {
      const w = style.outlineWidth
      const dx = [w, -w, 0, 0][i]
      const dy = [0, 0, w, -w][i]
      return `${dx}px ${dy}px 0 ${style.outlineColor}`
    })
    .join(", ")

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={videoUrl}
        controls
        onTimeUpdate={(e) => onTimeUpdate(Math.round(e.currentTarget.currentTime * 1000))}
        className="aspect-video w-full"
      />
      <div
        className="pointer-events-none absolute inset-0 flex px-[5%] pb-[3%] pt-[3%]"
        style={{ alignItems: align, justifyContent: "center" }}
      >
        {activeSegment && (
          <span
            className="max-w-[90%] whitespace-pre-line text-center leading-tight"
            style={{
              fontFamily: `${style.fontName}, sans-serif`,
              fontSize: `clamp(12px, ${style.fontSize / 18}vw, ${style.fontSize}px)`,
              color: style.primaryColor,
              textShadow,
              marginBottom: style.position === "bottom" ? `${style.marginV / 12}%` : undefined,
              backgroundColor: style.backgroundEnabled
                ? rgba(style.backgroundColor, style.backgroundOpacity)
                : "transparent",
              padding: style.backgroundEnabled ? "0.1em 0.4em" : undefined,
              borderRadius: style.backgroundEnabled ? "4px" : undefined,
            }}
          >
            {activeSegment.text}
          </span>
        )}
      </div>
    </div>
  )
})
