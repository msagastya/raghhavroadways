import Link from "next/link"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: {
    label: string
    href: string
  }
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(13,43,26,0.05)" }}
      >
        <Icon size={26} strokeWidth={1.4} className="text-brand-900/30" />
      </div>
      <p className="text-[15px] font-semibold text-brand-900/45">{title}</p>
      {subtitle && (
        <p className="text-[13px] text-brand-900/30 mt-1 max-w-xs">{subtitle}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-primary mt-5 text-[13px]"
              style={{ padding: "8px 18px" }}>
          {action.label}
        </Link>
      )}
    </div>
  )
}
