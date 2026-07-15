import { PageHeader } from "@/components/page-header"
import { CryptoWorkspace } from "@/components/crypto/crypto-workspace"

export const metadata = { title: "Nghiên cứu Crypto - DakaTool" }

export default function CryptoPage() {
  return (
    <div>
      <PageHeader
        title="Nghiên cứu thị trường Crypto"
        description="Bảng giá thật từ CoinGecko/Binance, chỉ báo kỹ thuật tính ngay trên trình duyệt, và phân tích AI bằng API key của bạn. Chỉ để nghiên cứu — không phải khuyến nghị đầu tư."
      />
      <CryptoWorkspace />
    </div>
  )
}
