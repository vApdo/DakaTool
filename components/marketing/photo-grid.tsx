/** Bố cục ảnh giống bài Facebook: 1 ảnh to, 2 ảnh cạnh nhau, 3 ảnh một to hai nhỏ, 4+ ảnh lưới 2×2 kèm "+N". */
export function PhotoGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null
  const shown = urls.slice(0, urls.length === 3 ? 3 : 4)
  const extra = urls.length - shown.length

  if (shown.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh nội bộ qua API có kiểm tra quyền
      <img src={shown[0]} alt="" className="max-h-[600px] w-full bg-black/5 object-contain dark:bg-white/5" />
    )
  }

  return (
    <div className={`grid gap-0.5 ${shown.length === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-2"}`}>
      {shown.map((url, i) => (
        <div key={url} className={`relative ${shown.length === 3 && i === 0 ? "row-span-2" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh nội bộ qua API có kiểm tra quyền */}
          <img src={url} alt="" className={`h-full w-full object-cover ${shown.length === 3 && i === 0 ? "" : "aspect-square"}`} />
          {i === shown.length - 1 && extra > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-3xl font-semibold text-white">+{extra}</span>
          )}
        </div>
      ))}
    </div>
  )
}
