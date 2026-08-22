/**
 * Tiện ích HTTP chung cho các route handler (JSON response + map lỗi nghiệp vụ).
 * Dùng chung cho các route API phía server.
 */
import { NextResponse } from "next/server"
import { ZodError } from "zod"

/** Lỗi quyền truy cập — map sang HTTP 401/403/404. */
export class AccessError extends Error {
  constructor(
    message: string,
    readonly kind: "not_found" | "forbidden" | "unauthorized",
  ) {
    super(message)
    this.name = "AccessError"
  }
}

/** Lỗi nghiệp vụ (trạng thái không cho phép thao tác). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init)
}

export function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", err.issues[0]?.message ?? "Dữ liệu không hợp lệ.", 400)
  }
  if (err instanceof AccessError) {
    if (err.kind === "not_found") return errorResponse("NOT_FOUND", err.message, 404)
    if (err.kind === "unauthorized") return errorResponse("UNAUTHORIZED", err.message, 401)
    return errorResponse("FORBIDDEN", err.message, 403)
  }
  if (err instanceof ConflictError) {
    return errorResponse("CONFLICT", err.message, 409)
  }
  // Lỗi ngoài dự kiến: KHÔNG trả err.message ra ngoài. Thông báo của Prisma chẳng
  // hạn có kèm đường dẫn file schema, tên biến môi trường và cấu hình datasource —
  // bất kỳ ai mở link đều đọc được. Chi tiết ghi vào log máy chủ, người dùng chỉ
  // thấy câu giải thích được việc mình cần làm.
  console.error("[api] Lỗi không xử lý được:", err)

  const message = isDatabaseUnavailable(err)
    ? "Chưa kết nối được cơ sở dữ liệu. Nếu bạn là người cài đặt, hãy kiểm tra biến môi trường DATABASE_URL."
    : "Lỗi máy chủ. Vui lòng thử lại; nếu vẫn lỗi, báo người quản trị kèm thời điểm gặp lỗi."
  return errorResponse("INTERNAL_ERROR", message, 500)
}

/**
 * Nhận diện nhóm lỗi "không có/không tới được database" để nói đúng nguyên nhân
 * thay vì một câu chung chung. Khớp theo mã lỗi Prisma:
 * P1012 thiếu biến môi trường, P1000/P1001/P1002 sai thông tin đăng nhập hoặc
 * không kết nối được, P2021/P2022 chưa chạy migration.
 */
function isDatabaseUnavailable(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const text = `${err.message} ${(err as { code?: string }).code ?? ""}`
  return /P1000|P1001|P1002|P1012|P2021|P2022|DATABASE_URL/.test(text)
}
