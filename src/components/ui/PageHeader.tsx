import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-brand-900/6 transition-colors shrink-0"
            title={backLabel ?? "Back"}
          >
            <ChevronLeft size={18} strokeWidth={2} className="text-brand-900/60" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold text-brand-900 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-brand-900/50 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
