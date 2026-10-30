/**
 * Mã hoá Page token trước khi lưu database (AES-256-GCM). Khoá suy ra từ FB_APP_SECRET:
 * đổi App Secret thì token cũ cũng vô hiệu phía Facebook, nên chỉ cần kết nối lại.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const KEY_INFO = "dakatool-mkt-page-token-v1"
const VERSION = "v1"

function keyFor(secret: string): Buffer {
  return createHash("sha256").update(`${KEY_INFO}:${secret}`).digest()
}

export function encryptToken(token: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv)
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".")
}

/** null khi chuỗi hỏng hoặc được mã hoá bằng secret khác. */
export function decryptToken(value: string, secret: string): string | null {
  const [version, iv, tag, data] = value.split(".")
  if (version !== VERSION || !iv || !tag || !data) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), Buffer.from(iv, "base64url"))
    decipher.setAuthTag(Buffer.from(tag, "base64url"))
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}
