/**
 * Tiện ích HTTP chung cho các route handler (JSON response + map lỗi nghiệp vụ).
 * Dùng chung cho Auto Subtitle và Quản lý công trình.
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
  const message = err instanceof Error ? err.message : "Lỗi máy chủ."
  return errorResponse("INTERNAL_ERROR", message, 500)
}
