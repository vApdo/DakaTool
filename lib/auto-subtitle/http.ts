/**
 * Tiện ích chuẩn hoá response JSON + map lỗi nghiệp vụ sang HTTP cho các route handler.
 */
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { AccessError, ConflictError } from "./repository"

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init)
}

export function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** Bắt lỗi phổ biến trong route handler và trả HTTP tương ứng. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", err.issues[0]?.message ?? "Dữ liệu không hợp lệ.", 400)
  }
  if (err instanceof AccessError) {
    return errorResponse(
      err.kind === "not_found" ? "NOT_FOUND" : "FORBIDDEN",
      err.message,
      err.kind === "not_found" ? 404 : 403,
    )
  }
  if (err instanceof ConflictError) {
    return errorResponse("CONFLICT", err.message, 409)
  }
  const message = err instanceof Error ? err.message : "Lỗi máy chủ."
  return errorResponse("INTERNAL_ERROR", message, 500)
}
