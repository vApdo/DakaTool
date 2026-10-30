import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AccessGate } from "@/components/access-gate"
import { PageHeader } from "@/components/page-header"
import { PostEditor } from "@/components/marketing/post-editor"

export const metadata = { title: "Soạn bài - DakaTool" }

export default function NewPostPage() {
  return (
    <div>
      <Link href="/marketing" className="btn-secondary mb-4 text-gray-600 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Marketing
      </Link>
      <PageHeader title="Soạn bài" />
      <AccessGate>
        <PostEditor />
      </AccessGate>
    </div>
  )
}
