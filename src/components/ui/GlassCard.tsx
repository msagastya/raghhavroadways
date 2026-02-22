import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  strong?: boolean
  padding?: boolean
}

export default function GlassCard({
  children,
  className,
  strong = false,
  padding = true,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-2xl",
        padding && "p-8",
        className
      )}
    >
      {children}
    </div>
  )
}
