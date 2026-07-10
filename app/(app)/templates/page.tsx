import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ToolIcon } from "@/components/tool-icon"
import { templates } from "@/lib/data"

export const metadata = { title: "Thư viện Template - DakaTool" }

export default function TemplatesPage() {
  return (
    <div>
      <PageHeader
        title="Thư viện Template"
        description="Các quy trình dựng sẵn cho những việc hay gặp. Dùng template làm điểm bắt đầu thay vì tạo tool từ con số không."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="card flex flex-col p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7A7FEE]/10 text-[#7A7FEE]">
                <ToolIcon name={tpl.icon} className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {tpl.category}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-black dark:text-white">{tpl.name}</h3>
            <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{tpl.description}</p>

            <ol className="mt-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {tpl.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7A7FEE]/10 text-[10px] font-semibold text-[#7A7FEE]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="mt-auto pt-5">
              <Link href="/tools/new" className="btn-outline w-full justify-center">
                Dùng template này
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
