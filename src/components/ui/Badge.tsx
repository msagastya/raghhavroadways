import { cn } from "@/lib/utils"

type BadgeVariant =
  | "booked"
  | "in_transit"
  | "delivered"
  | "billed"
  | "partially_paid"
  | "paid"
  | "cancelled"
  | "draft"
  | "generated"
  | "sent"
  | "available"
  | "on_trip"
  | "in_repair"
  | "inactive"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"

const variantStyles: Record<BadgeVariant, string> = {
  booked:         "bg-blue-50 text-blue-700 border-blue-200",
  in_transit:     "bg-amber-50 text-amber-700 border-amber-200",
  delivered:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  billed:         "bg-violet-50 text-violet-700 border-violet-200",
  partially_paid: "bg-orange-50 text-orange-700 border-orange-200",
  paid:           "bg-green-50 text-green-700 border-green-200",
  cancelled:      "bg-red-50 text-red-600 border-red-200",
  draft:          "bg-gray-50 text-gray-600 border-gray-200",
  generated:      "bg-blue-50 text-blue-700 border-blue-200",
  sent:           "bg-cyan-50 text-cyan-700 border-cyan-200",
  available:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_trip:        "bg-amber-50 text-amber-700 border-amber-200",
  in_repair:      "bg-red-50 text-red-600 border-red-200",
  inactive:       "bg-gray-50 text-gray-500 border-gray-200",
  success:        "bg-green-50 text-green-700 border-green-200",
  warning:        "bg-amber-50 text-amber-700 border-amber-200",
  danger:         "bg-red-50 text-red-600 border-red-200",
  info:           "bg-blue-50 text-blue-700 border-blue-200",
  neutral:        "bg-gray-50 text-gray-600 border-gray-200",
}

const variantLabels: Partial<Record<BadgeVariant, string>> = {
  booked:         "Booked",
  in_transit:     "In Transit",
  delivered:      "Delivered",
  billed:         "Billed",
  partially_paid: "Part Paid",
  paid:           "Paid",
  cancelled:      "Cancelled",
  draft:          "Draft",
  generated:      "Generated",
  sent:           "Sent",
  available:      "Available",
  on_trip:        "On Trip",
  in_repair:      "In Repair",
  inactive:       "Inactive",
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
  className?: string
}

export default function Badge({ variant, label, className }: BadgeProps) {
  const text = label ?? variantLabels[variant] ?? variant
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border",
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  )
}
