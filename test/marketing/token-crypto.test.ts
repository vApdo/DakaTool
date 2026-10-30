import { describe, expect, it } from "vitest"
import { decryptToken, encryptToken } from "@/lib/marketing/token-crypto"

describe("mã hoá Page token", () => {
  it("giải mã lại đúng token và không lưu token thô", () => {
    const sealed = encryptToken("EAAG-page-token", "app-secret")
    expect(sealed).not.toContain("EAAG")
    expect(decryptToken(sealed, "app-secret")).toBe("EAAG-page-token")
  })

  it("mỗi lần mã hoá ra chuỗi khác nhau", () => {
    expect(encryptToken("t", "s")).not.toBe(encryptToken("t", "s"))
  })

  it("đổi App Secret hoặc chuỗi bị sửa thì không giải mã được", () => {
    const sealed = encryptToken("t", "s")
    expect(decryptToken(sealed, "khac")).toBeNull()
    expect(decryptToken(`${sealed.slice(0, -2)}xx`, "s")).toBeNull()
    expect(decryptToken("rac", "s")).toBeNull()
  })
})
