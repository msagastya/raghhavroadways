import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  iconColor?: string
  iconBg?: string
  trend?: {
    value: string
    positive: boolean
    label?: string
  }
  className?: string
  delay?: number
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-brand-900",
  iconBg = "bg-brand-50",
  trend,
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className={cn("glass rounded-2xl p-4 md:p-8 animate-fade-up", className)}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-widest text-brand-900/55 mb-3">
            {title}
          </p>
          <p className="text-[26px] md:text-[38px] font-bold text-brand-900 leading-none mb-2 truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-[12px] md:text-[14px] text-brand-900/55 truncate">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 mt-2 md:mt-3 text-[13px] font-semibold px-3 py-1 rounded-full",
                trend.positive
                  ? "bg-emerald-100/70 text-emerald-700"
                  : "bg-red-100/70 text-red-600"
              )}
            >
              {trend.positive ? (
                <TrendingUp size={13} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={13} strokeWidth={2.5} />
              )}
              {trend.value}
              {trend.label && (
                <span className="font-normal opacity-80">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            "w-11 h-11 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0",
            iconBg
          )}
          style={{
            boxShadow: "0 4px 16px rgba(13,43,26,0.15), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Icon size={30} strokeWidth={1.6} className={iconColor} />
        </div>
      </div>
    </div>
  )
}
