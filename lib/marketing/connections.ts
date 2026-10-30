/** Fanpage đã kết nối qua Facebook Login và client Graph API dùng token của chúng. */
import { prisma } from "@/lib/prisma"
import { UpstreamError } from "@/lib/http"
import { createFacebookClient, facebookAppConfig, type FacebookClient, type FacebookPage, type PageWithToken } from "./facebook"
import { decryptToken, encryptToken } from "./token-crypto"

export interface ConnectionInfo {
  pages: FacebookPage[]
  connectedBy: string | null
  connectedAt: string | null
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  const rows = await prisma.mktPageConnection.findMany({ orderBy: { pageName: "asc" } })
  const latest = rows.reduce<(typeof rows)[number] | null>((a, b) => (!a || b.connectedAt > a.connectedAt ? b : a), null)
  return {
    pages: rows.map((row) => ({ id: row.pageId, name: row.pageName })),
    connectedBy: latest?.connectedBy ?? null,
    connectedAt: latest?.connectedAt.toISOString() ?? null,
  }
}

export async function listConnectedPages(): Promise<FacebookPage[]> {
  return (await getConnectionInfo()).pages
}

function appSecret(): string {
  const config = facebookAppConfig()
  if (!config) throw new UpstreamError("Chưa cấu hình ứng dụng Facebook (FB_APP_ID, FB_APP_SECRET).")
  return config.appSecret
}

async function pageToken(pageId: string): Promise<string | null> {
  const row = await prisma.mktPageConnection.findUnique({ where: { pageId } })
  return row ? decryptToken(row.encryptedToken, appSecret()) : null
}

export function getFacebookClient(): FacebookClient {
  return createFacebookClient(pageToken)
}

/** Thay toàn bộ danh sách Fanpage bằng những trang người vừa đăng nhập đã chọn cho phép. */
export async function replaceConnections(pages: PageWithToken[], connectedBy: string): Promise<void> {
  const secret = appSecret()
  await prisma.$transaction([
    prisma.mktPageConnection.deleteMany({}),
    prisma.mktPageConnection.createMany({
      data: pages.map((page) => ({
        pageId: page.id,
        pageName: page.name,
        encryptedToken: encryptToken(page.accessToken, secret),
        connectedBy,
      })),
    }),
  ])
}

export async function disconnectAll(): Promise<void> {
  await prisma.mktPageConnection.deleteMany({})
}
