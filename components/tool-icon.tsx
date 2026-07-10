import {
  FolderPen,
  Table,
  Mail,
  Globe,
  ImageDown,
  RefreshCw,
  BarChart3,
  Scissors,
  CalendarCheck,
  FolderCog,
  TrendingDown,
  Sparkles,
  Archive,
  DatabaseBackup,
  Wrench,
  type LucideIcon,
} from "lucide-react"

const icons: Record<string, LucideIcon> = {
  FolderPen,
  Table,
  Mail,
  Globe,
  ImageDown,
  RefreshCw,
  BarChart3,
  Scissors,
  CalendarCheck,
  FolderCog,
  TrendingDown,
  Sparkles,
  Archive,
  DatabaseBackup,
}

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Wrench
  return <Icon className={className} aria-hidden="true" />
}
