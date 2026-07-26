interface FooterProps {
  lastUpdated: string
}

export function Footer({ lastUpdated }: FooterProps) {
  return (
    <footer className="app-footer">
      <p>
        Công cụ ước tính tham khảo, không phải tư vấn thuế hay tài chính. Biểu phí có thể thay đổi theo thông báo
        chính thức của sàn.
      </p>
      <p>
        Biểu phí cập nhật: {lastUpdated} · Mọi con số tính ngay trên máy bạn — không gửi đi đâu ·{" "}
        {/* Placeholder theo spec — thay href bằng link Zalo/Facebook của bạn trước khi quảng bá (xem README). */}
        <a href="#">Góp ý cho tool</a>
      </p>
    </footer>
  )
}
