import type { MktPost, MktPostMedia, MktPostMetric, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getStorage } from "@/lib/storage"
import { AccessError, ConflictError, UpstreamError } from "@/lib/http"
import { getFacebookClient, listConnectedPages } from "./connections"
import type { PostInput } from "./schemas"
import type { MktPostDto } from "./types"
import { STUCK_PUBLISHING_MS, assertCanPerform, assertScheduleWindow, isOnFacebook } from "./workflow"

type PostRow = MktPost & { media: MktPostMedia[]; metric: MktPostMetric | null }

const include = { media: { orderBy: { sortOrder: "asc" } }, metric: true } satisfies Prisma.MktPostInclude
const MAX_LIST = 300

function toDto(row: PostRow): MktPostDto {
  return {
    id: row.id,
    fbPageId: row.fbPageId,
    pageName: row.pageName,
    status: row.status,
    message: row.message,
    link: row.link,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    authorName: row.authorName,
    fbPostId: row.fbPostId,
    permalinkUrl: row.permalinkUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    media: row.media.map((m) => ({
      id: m.id,
      key: m.storageKey,
      contentType: m.contentType,
      sizeBytes: m.sizeBytes,
      url: `/api/marketing/media?key=${encodeURIComponent(m.storageKey)}`,
    })),
    metric: row.metric
      ? {
          views: row.metric.views,
          uniqueViews: row.metric.uniqueViews,
          clicks: row.metric.clicks,
          reactions: row.metric.reactions,
          comments: row.metric.comments,
          shares: row.metric.shares,
          fetchedAt: row.metric.fetchedAt.toISOString(),
        }
      : null,
  }
}

async function findRow(id: string): Promise<PostRow> {
  const row = await prisma.mktPost.findUnique({ where: { id }, include })
  if (!row) throw new AccessError("Không tìm thấy bài viết.", "not_found")
  return row
}

async function pageName(fbPageId: string): Promise<string> {
  const page = (await listConnectedPages()).find((p) => p.id === fbPageId)
  if (!page) throw new ConflictError("Fanpage đã chọn chưa được kết nối với DakaTool. Hãy kết nối lại Facebook và chọn Fanpage này.")
  return page.name
}

/** Ảnh phải thực sự đã nằm trong storage và đúng dung lượng khai báo. */
async function assertMediaUploaded(media: PostInput["media"]): Promise<void> {
  const storage = getStorage()
  for (const item of media) {
    const stat = await storage.statObject(item.key)
    if (!stat) throw new ConflictError("Có ảnh chưa tải lên xong. Hãy chọn lại ảnh.")
    if (stat.sizeBytes !== item.sizeBytes) throw new ConflictError("Ảnh tải lên bị lỗi dung lượng. Hãy chọn lại ảnh.")
  }
}

async function removeStoredMedia(keys: string[]): Promise<void> {
  const storage = getStorage()
  await Promise.all(keys.map((key) => storage.deleteObject(key).catch(() => undefined)))
}

function mediaCreate(media: PostInput["media"]) {
  return media.map((m, index) => ({
    storageKey: m.key,
    contentType: m.contentType,
    sizeBytes: m.sizeBytes,
    sortOrder: index,
  }))
}

/**
 * Bài trong khoảng thời gian: theo giờ đăng/giờ hẹn nếu có, không thì theo ngày tạo.
 * Không truyền khoảng → các bài cập nhật gần nhất.
 */
export async function listPosts(range: { from?: Date; to?: Date } = {}): Promise<MktPostDto[]> {
  let where: Prisma.MktPostWhereInput = {}
  if (range.from || range.to) {
    const window = { gte: range.from, lt: range.to }
    where = {
      OR: [
        { publishedAt: window },
        { publishedAt: null, scheduledAt: window },
        { publishedAt: null, scheduledAt: null, createdAt: window },
      ],
    }
  }
  const rows = await prisma.mktPost.findMany({ where, include, orderBy: { updatedAt: "desc" }, take: MAX_LIST })
  return rows.map(toDto)
}

export async function getPost(id: string): Promise<MktPostDto> {
  return toDto(await findRow(id))
}

export async function createPost(input: PostInput): Promise<MktPostDto> {
  await assertMediaUploaded(input.media)
  const row = await prisma.mktPost.create({
    data: {
      fbPageId: input.fbPageId,
      pageName: await pageName(input.fbPageId),
      message: input.message,
      link: input.link,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      authorName: input.authorName,
      media: { create: mediaCreate(input.media) },
    },
    include,
  })
  return toDto(row)
}

export async function updatePost(id: string, input: PostInput): Promise<MktPostDto> {
  const current = await findRow(id)
  assertCanPerform("edit", current.status)
  await assertMediaUploaded(input.media)

  const keptKeys = new Set(input.media.map((m) => m.key))
  const removedKeys = current.media.map((m) => m.storageKey).filter((key) => !keptKeys.has(key))
  const name = input.fbPageId === current.fbPageId ? current.pageName : await pageName(input.fbPageId)

  const row = await prisma.$transaction(async (tx) => {
    await tx.mktPostMedia.deleteMany({ where: { postId: id } })
    return tx.mktPost.update({
      where: { id },
      data: {
        fbPageId: input.fbPageId,
        pageName: name,
        message: input.message,
        link: input.link,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        authorName: input.authorName,
        status: "DRAFT",
        lastError: null,
        media: { create: mediaCreate(input.media) },
      },
      include,
    })
  })
  await removeStoredMedia(removedKeys)
  return toDto(row)
}

async function readMedia(key: string, contentType: string): Promise<Blob> {
  const chunks: Buffer[] = []
  for await (const chunk of await getStorage().getObjectStream(key)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  return new Blob([Buffer.concat(chunks)], { type: contentType })
}

/**
 * Đăng ngay hoặc hẹn giờ trên Facebook.
 * Chuyển sang PUBLISHING bằng một lệnh cập nhật có điều kiện trước khi gọi Facebook,
 * nên hai người bấm Đăng cùng lúc cũng chỉ một lần đăng.
 */
export async function publishPost(id: string, now: Date = new Date()): Promise<MktPostDto> {
  const current = await findRow(id)
  assertCanPerform("publish", current.status, current.updatedAt, now)
  assertScheduleWindow(current.scheduledAt, now)
  const facebook = getFacebookClient()

  const claimed = await prisma.mktPost.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["DRAFT", "FAILED"] } },
        { status: "PUBLISHING", updatedAt: { lt: new Date(now.getTime() - STUCK_PUBLISHING_MS) } },
      ],
    },
    data: { status: "PUBLISHING", lastError: null },
  })
  if (claimed.count === 0) throw new ConflictError("Bài này vừa được người khác xử lý. Tải lại trang để xem trạng thái mới.")

  try {
    const photos = await Promise.all(
      current.media.map(async (m) => ({
        data: await readMedia(m.storageKey, m.contentType),
        filename: m.storageKey.split("/").pop() ?? "photo",
      })),
    )
    const fbPostId = await facebook.publish({
      pageId: current.fbPageId,
      message: current.message,
      link: current.link,
      photos,
      scheduledAt: current.scheduledAt,
    })
    const scheduled = current.scheduledAt !== null
    const permalinkUrl = scheduled
      ? null
      : await facebook.getPostStatus(fbPostId).then((s) => s.permalinkUrl, () => null)

    const row = await prisma.mktPost.update({
      where: { id },
      data: {
        status: scheduled ? "SCHEDULED" : "PUBLISHED",
        fbPostId,
        permalinkUrl,
        publishedAt: scheduled ? null : now,
      },
      include,
    })
    return toDto(row)
  } catch (error) {
    const message = error instanceof UpstreamError ? error.message : "Lỗi không xác định khi đăng lên Facebook."
    if (!(error instanceof UpstreamError)) console.error("[marketing] Đăng bài lỗi:", error)
    await prisma.mktPost.update({ where: { id }, data: { status: "FAILED", lastError: message } })
    throw error instanceof UpstreamError ? error : new UpstreamError(message)
  }
}

/** Huỷ lịch: xoá bài hẹn giờ trên Facebook, đưa bài về nháp để sửa và đăng lại. */
export async function cancelPost(id: string): Promise<MktPostDto> {
  const current = await findRow(id)
  assertCanPerform("cancel", current.status)
  if (current.fbPostId) await getFacebookClient().deletePost(current.fbPostId)
  const row = await prisma.mktPost.update({
    where: { id },
    data: { status: "DRAFT", fbPostId: null, permalinkUrl: null },
    include,
  })
  return toDto(row)
}

/** Xoá bài; nếu bài đã lên Facebook thì xoá luôn trên Fanpage. */
export async function deletePost(id: string): Promise<void> {
  const current = await findRow(id)
  assertCanPerform("delete", current.status)
  if (isOnFacebook(current.status) && current.fbPostId) await getFacebookClient().deletePost(current.fbPostId)
  await prisma.mktPost.delete({ where: { id } })
  await removeStoredMedia(current.media.map((m) => m.storageKey))
}
