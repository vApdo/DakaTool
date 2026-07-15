import { CheckCircle2, KeyRound, XCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { getServerAiConfig } from "@/lib/crypto/server-ai-config"

export const metadata = { title: "Quản trị - DakaTool" }
// Đọc biến môi trường lúc chạy (không đóng băng lúc build).
export const dynamic = "force-dynamic"

export default function AdminPage() {
  const config = getServerAiConfig()

  return (
    <div>
      <PageHeader
        title="Quản trị hệ thống"
        description="Cấu hình AI dùng chung cho toàn bộ người dùng. API key nằm trong biến môi trường trên Vercel — không bao giờ được gửi xuống trình duyệt."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-black dark:text-white">
            <KeyRound className="h-5 w-5 text-primary" />
            Trạng thái AI dùng chung
          </h2>
          {config ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Đã cấu hình — người dùng không cần nhập key.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Nhà cung cấp</dt>
                  <dd className="font-medium text-black dark:text-white">
                    {config.provider === "openai" ? "OpenAI (GPT)" : "Anthropic (Claude)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Model</dt>
                  <dd className="font-medium text-black dark:text-white">{config.model}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">API key</dt>
                  <dd className="font-medium text-black dark:text-white">
                    Đã đặt ({config.apiKey.slice(0, 7)}•••{config.apiKey.slice(-4)})
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Người dùng gọi AI qua server của app (giới hạn 10 lượt / 10 phút mỗi IP). Nên đặt hạn mức chi tiêu
                (spend limit) trong tài khoản nhà cung cấp AI để kiểm soát chi phí.
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              Chưa cấu hình — người dùng phải tự nhập API key của họ.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Cách cấu hình (một lần, ~2 phút)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              Mở{" "}
              <a
                href="https://vercel.com/v-apdo/dakatool/settings/environment-variables"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline"
              >
                Vercel → dakatool → Settings → Environment Variables
              </a>
            </li>
            <li>
              Thêm 3 biến (áp dụng cho Production và Preview):
              <ul className="mt-1.5 space-y-1 font-mono text-xs">
                <li><span className="font-semibold">AI_API_KEY</span> = key của bạn (sk-ant-... hoặc sk-...)</li>
                <li><span className="font-semibold">AI_PROVIDER</span> = anthropic hoặc openai</li>
                <li><span className="font-semibold">AI_MODEL</span> = vd claude-opus-4-8 (bỏ trống = mặc định)</li>
              </ul>
            </li>
            <li>Bấm Redeploy (Deployments → dấu ⋯ → Redeploy) để áp dụng.</li>
            <li>Quay lại trang này kiểm tra trạng thái chuyển sang "Đã cấu hình".</li>
          </ol>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Muốn đổi model hay key: sửa biến môi trường rồi Redeploy — không cần sửa code.
          </p>
        </section>
      </div>
    </div>
  )
}
