/**
 * GET /api/construction/storage-check — chẩn đoán kho lưu trữ (chỉ quản lý).
 *
 * Vì sao cần: ảnh được trình duyệt PUT thẳng lên R2 bằng URL đã ký. Khi R2 từ chối,
 * phản hồi lỗi KHÔNG kèm header CORS, nên trình duyệt nuốt mất mã lỗi và chỉ báo
 * "blocked by CORS policy". Người cài đặt không có cách nào biết thật sự sai gì.
 *
 * Route này chạy phía máy chủ nên không dính CORS: nó ghi thử một file bé bằng
 * đúng khoá và cấu hình đang dùng, rồi trả về NGUYÊN VĂN lỗi của R2.
 *
 * Thử cả hai kiểu địa chỉ (path-style và virtual-hosted) vì R2 không phải lúc nào
 * cũng chấp nhận như nhau — biết kiểu nào chạy được là biết phải đặt
 * S3_FORCE_PATH_STYLE ra sao.
 *
 * KHÔNG bao giờ trả về khoá bí mật: chỉ trả tên bucket, region, host của endpoint
 * (những thứ vốn đã lộ trong mọi URL ảnh) và độ dài khoá để soát lỗi dán thiếu.
 */
import type { NextRequest } from "next/server"
import { handleError, ok } from "@/lib/http"
import { requireManager } from "@/lib/construction/access"
import { S3StorageProvider } from "@/lib/storage/s3-storage"

export const runtime = "nodejs"
export const maxDuration = 30
// Route đọc cookie để kiểm quyền quản lý nên không thể dựng sẵn lúc build.
// Không khai báo thì Next thử dựng tĩnh rồi in một trang lỗi vào log build.
export const dynamic = "force-dynamic"

interface AttemptResult {
  style: "path-style" | "virtual-hosted"
  ghiThu: "OK" | "LỖI"
  maLoi?: string
  thongBao?: string
  urlDaKy?: { host: string; duongDan: string; thamSo: string[] }
}

/**
 * Soi một khoá mà KHÔNG lộ giá trị: chỉ báo độ dài, độ dài mong đợi, và ký tự lạ
 * đầu tiên kèm vị trí. Đủ để người cài đặt biết mình dán thừa cái gì, ở đâu.
 */
function soiKhoa(raw: string | undefined, doDaiMongDoi: number) {
  if (!raw) return { trangThai: "CHƯA ĐẶT" }
  const sauKhiCat = raw.trim()
  const la = sauKhiCat.match(/[^A-Za-z0-9]/)
  return {
    doDai: raw.length,
    doDaiMongDoi,
    coKhoangTrangThua: raw !== sauKhiCat,
    kyTuLa: la
      ? {
          moTa: /\s/.test(la[0]) ? "khoảng trắng hoặc xuống dòng" : `"${la[0]}"`,
          viTri: `${sauKhiCat.indexOf(la[0]) + 1}/${sauKhiCat.length}`,
        }
      : null,
    trangThai:
      !la && sauKhiCat.length === doDaiMongDoi && raw === sauKhiCat ? "OK" : "CÓ VẤN ĐỀ",
  }
}

function describeError(err: unknown): { maLoi: string; thongBao: string } {
  if (!(err instanceof Error)) return { maLoi: "UNKNOWN", thongBao: String(err) }
  const meta = err as Error & { Code?: string; $metadata?: { httpStatusCode?: number } }
  const status = meta.$metadata?.httpStatusCode
  return {
    maLoi: `${meta.Code ?? err.name}${status ? ` (HTTP ${status})` : ""}`,
    thongBao: err.message,
  }
}

async function tryStyle(forcePathStyle: boolean): Promise<AttemptResult> {
  const style = forcePathStyle ? "path-style" : "virtual-hosted"
  const provider = new S3StorageProvider({
    bucket: process.env.S3_BUCKET as string,
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    forcePathStyle,
  })

  const key = `_kiem-tra/${Date.now()}-${style}.txt`
  const result: AttemptResult = { style, ghiThu: "LỖI" }

  // Xem URL đã ký trông thế nào (bỏ chữ ký, chỉ giữ TÊN tham số).
  try {
    const ticket = await provider.createUploadUrl!({
      key,
      contentType: "image/jpeg",
      maxSizeBytes: 1024,
    })
    const u = new URL(ticket.url)
    result.urlDaKy = {
      host: u.host,
      duongDan: u.pathname,
      thamSo: [...u.searchParams.keys()],
    }
  } catch {
    // Ký hỏng thì bước ghi bên dưới sẽ nói rõ lý do.
  }

  try {
    await provider.putObject({
      key,
      body: Buffer.from("kiem tra ghi"),
      contentType: "text/plain",
      contentLength: 12,
    })
    result.ghiThu = "OK"
    await provider.deleteObject(key).catch(() => undefined)
  } catch (err) {
    const { maLoi, thongBao } = describeError(err)
    result.maLoi = maLoi
    result.thongBao = thongBao
    console.error(`[storage-check] ${style} ghi thất bại:`, err)
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    await requireManager(request)

    const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase()
    if (driver !== "s3") {
      return ok({
        ketLuan: `STORAGE_DRIVER đang là "${driver}", không phải "s3". Trên Vercel phải là s3 vì ổ đĩa chỉ đọc.`,
        cauHinh: { STORAGE_DRIVER: driver },
      })
    }

    const endpoint = process.env.S3_ENDPOINT ?? ""
    const bucket = process.env.S3_BUCKET ?? ""
    let endpointHost = ""
    let endpointCoDuongDan = false
    try {
      const u = new URL(endpoint)
      endpointHost = u.host
      endpointCoDuongDan = u.pathname !== "" && u.pathname !== "/"
    } catch {
      endpointHost = "(S3_ENDPOINT không phải URL hợp lệ)"
    }

    const cauHinh = {
      STORAGE_DRIVER: driver,
      S3_BUCKET: bucket,
      S3_REGION: process.env.S3_REGION ?? "(chưa đặt → auto)",
      S3_ENDPOINT_host: endpointHost,
      S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? "(chưa đặt → false)",
      khoa: {
        ACCESS_KEY_ID: soiKhoa(process.env.S3_ACCESS_KEY_ID, 32),
        SECRET_ACCESS_KEY: soiKhoa(process.env.S3_SECRET_ACCESS_KEY, 64),
      },
    }

    const canhBao: string[] = []
    if (endpointCoDuongDan) {
      canhBao.push(
        "S3_ENDPOINT có kèm đường dẫn (thường là tên bucket). Phải bỏ đi, chỉ để " +
          "https://<mã-tài-khoản>.r2.cloudflarestorage.com — nếu không tên bucket bị lặp hai lần.",
      )
    }
    if (endpoint.includes(bucket) && bucket) {
      canhBao.push(`S3_ENDPOINT đang chứa tên bucket "${bucket}" — gần như chắc chắn là thừa.`)
    }
    if ((process.env.S3_REGION ?? "auto") !== "auto") {
      canhBao.push(`S3_REGION nên là "auto" với Cloudflare R2.`)
    }
    for (const [ten, doDai] of [
      ["S3_ACCESS_KEY_ID", 32],
      ["S3_SECRET_ACCESS_KEY", 64],
    ] as const) {
      const soi = soiKhoa(process.env[ten], doDai)
      if (soi.trangThai !== "OK") {
        canhBao.push(
          `${ten} không đúng dạng (dài ${soi.doDai ?? 0}, cần ${doDai} ký tự chữ và số` +
            (soi.kyTuLa ? `, có ${soi.kyTuLa.moTa} ở vị trí ${soi.kyTuLa.viTri}` : "") +
            "). Copy lại đúng dãy khoá, không kèm nhãn hay dòng thừa, rồi Redeploy.",
        )
      }
    }

    const thuNghiem = [await tryStyle(true), await tryStyle(false)]

    const chayDuoc = thuNghiem.filter((t) => t.ghiThu === "OK").map((t) => t.style)
    const dangDung = process.env.S3_FORCE_PATH_STYLE === "true" ? "path-style" : "virtual-hosted"

    let ketLuan: string
    if (chayDuoc.length === 0) {
      ketLuan =
        "Không ghi được bằng cả hai kiểu → lỗi nằm ở khoá hoặc cấu hình, không phải ở trình duyệt. " +
        "Xem mã lỗi trong phần thuNghiem bên dưới."
    } else if (chayDuoc.includes(dangDung)) {
      ketLuan = `Máy chủ ghi được bằng kiểu đang dùng (${dangDung}) → khoá và bucket đều đúng. Lỗi nằm ở khâu trình duyệt PUT bằng URL đã ký.`
    } else {
      ketLuan = `Kiểu đang dùng (${dangDung}) KHÔNG ghi được, nhưng ${chayDuoc.join(" và ")} thì được. Đặt S3_FORCE_PATH_STYLE=${chayDuoc.includes("path-style") ? "true" : "false"} trên Vercel rồi Redeploy.`
    }

    return ok({ ketLuan, canhBao, cauHinh, dangDung, thuNghiem })
  } catch (err) {
    return handleError(err)
  }
}
