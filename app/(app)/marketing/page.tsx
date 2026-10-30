import { AccessGate } from "@/components/access-gate"
import { MarketingFeed } from "@/components/marketing/marketing-feed"

export const metadata = { title: "Marketing - DakaTool" }

export default function MarketingPage() {
  return (
    <AccessGate>
      <MarketingFeed />
    </AccessGate>
  )
}
