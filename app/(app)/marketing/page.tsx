import Link from "next/link"
import { PenSquare } from "lucide-react"
import { AccessGate } from "@/components/access-gate"
import { PageHeader } from "@/components/page-header"
import { FacebookConnection } from "@/components/marketing/facebook-connection"
import { PostList } from "@/components/marketing/post-list"

export const metadata = { title: "Marketing - DakaTool" }

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Soạn bài cho Fanpage, gửi trưởng nhóm duyệt, rồi đăng ngay hoặc hẹn giờ."
        action={
          <Link href="/marketing/new" className="btn-primary min-h-11">
            <PenSquare className="h-4 w-4" />
            Soạn bài
          </Link>
        }
      />
      <AccessGate>
        <FacebookConnection />
        <PostList />
      </AccessGate>
    </div>
  )
}
