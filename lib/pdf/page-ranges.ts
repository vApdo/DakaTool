/**
 * Phân tích chuỗi khoảng trang người dùng nhập, vd "1-3, 5, 7-10".
 * Trả về danh sách nhóm trang (mỗi nhóm thành một file khi tách).
 * Số trang tính từ 1; kết quả là chỉ số từ 0 để dùng với pdf-lib.
 */
export function parsePageRanges(input: string, pageCount: number): number[][] {
  const trimmed = input.trim()
  if (!trimmed) {
    // Không nhập gì → tách từng trang riêng.
    return Array.from({ length: pageCount }, (_, i) => [i])
  }

  const groups: number[][] = []
  for (const part of trimmed.split(",")) {
    const piece = part.trim()
    if (!piece) continue
    const match = piece.match(/^(\d+)\s*-\s*(\d+)$/) ?? piece.match(/^(\d+)$/)
    if (!match) throw new Error(`Không hiểu khoảng trang "${piece}". Dùng dạng: 1-3, 5, 7-10`)
    const from = Number(match[1])
    const to = Number(match[2] ?? match[1])
    if (from < 1 || to > pageCount) {
      throw new Error(`Khoảng "${piece}" nằm ngoài số trang của file (1–${pageCount}).`)
    }
    if (from > to) throw new Error(`Khoảng "${piece}" có trang bắt đầu lớn hơn trang kết thúc.`)
    const group: number[] = []
    for (let p = from; p <= to; p++) group.push(p - 1)
    groups.push(group)
  }
  if (groups.length === 0) throw new Error("Chưa có khoảng trang hợp lệ nào.")
  return groups
}
