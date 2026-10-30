/**
 * Màu và khối giao diện bắt chước facebook.com (sáng/tối) cho mục Marketing.
 * Gom ở một chỗ để các thành phần trông như cùng một trang Facebook.
 */
export const fb = {
  page: "bg-[#F0F2F5] text-[#050505] dark:bg-[#18191A] dark:text-[#E4E6EB]",
  card: "rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:bg-[#242526] dark:shadow-none",
  text: "text-[#050505] dark:text-[#E4E6EB]",
  muted: "text-[#65676B] dark:text-[#B0B3B8]",
  hover: "hover:bg-[#F2F2F2] dark:hover:bg-[#3A3B3C]",
  divider: "border-[#CED0D4] dark:border-[#3E4042]",
  input: "bg-[#F0F2F5] dark:bg-[#3A3B3C]",
  grayButton:
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-[#E4E6EB] px-3 text-[15px] font-semibold text-[#050505] hover:bg-[#D8DADF] disabled:opacity-50 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]",
  blueButton:
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1877F2] px-3 text-[15px] font-semibold text-white hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:bg-[#E4E6EB] disabled:text-[#BCC0C4] dark:disabled:bg-[#3A3B3C] dark:disabled:text-[#686A6E]",
  link: "font-semibold text-[#0064D1] hover:underline dark:text-[#2D88FF]",
  font: { fontFamily: '"Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif' },
} as const
