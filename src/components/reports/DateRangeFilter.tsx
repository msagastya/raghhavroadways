"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { CalendarRange } from "lucide-react"

interface Props {
  from: string
  to:   string
}

export default function DateRangeFilter({ from, to }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const [, start]  = useTransition()

  function apply(key: "from" | "to", value: string) {
    const sp = new URLSearchParams(params.toString())
    sp.set(key, value)
    start(() => router.push(`${pathname}?${sp.toString()}`))
  }

  function resetToYear() {
    const year = new Date().getFullYear()
    const sp   = new URLSearchParams()
    sp.set("from", `${year}-01-01`)
    sp.set("to",   `${year}-12-31`)
    start(() => router.push(`${pathname}?${sp.toString()}`))
  }

  function setPreset(label: string) {
    const now  = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const sp   = new URLSearchParams()
    if (label === "This Month") {
      sp.set("from", new Date(year, month, 1).toISOString().split("T")[0])
      sp.set("to",   new Date(year, month + 1, 0).toISOString().split("T")[0])
    } else if (label === "Last Month") {
      sp.set("from", new Date(year, month - 1, 1).toISOString().split("T")[0])
      sp.set("to",   new Date(year, month, 0).toISOString().split("T")[0])
    } else if (label === "This Quarter") {
      const q = Math.floor(month / 3)
      sp.set("from", new Date(year, q * 3, 1).toISOString().split("T")[0])
      sp.set("to",   new Date(year, q * 3 + 3, 0).toISOString().split("T")[0])
    } else if (label === "This Year") {
      sp.set("from", `${year}-01-01`)
      sp.set("to",   `${year}-12-31`)
    }
    start(() => router.push(`${pathname}?${sp.toString()}`))
  }

  const presets = ["This Month", "Last Month", "This Quarter", "This Year"]

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background:    "rgba(255,255,255,0.70)",
        backdropFilter:"blur(24px) saturate(150%)",
        border:        "1px solid rgba(255,255,255,0.65)",
        boxShadow:     "0 4px 16px rgba(13,43,26,0.07)",
      }}
    >
      <CalendarRange size={15} strokeWidth={1.8} className="text-brand-900/50 shrink-0" />
      <span className="text-[12px] font-semibold text-brand-900/55 shrink-0">Date Range</span>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => apply("from", e.target.value)}
          className="text-[12px] font-medium text-brand-900 bg-white/70 border border-brand-900/12 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-600/40 transition-colors"
        />
        <span className="text-[12px] text-brand-900/35 font-medium">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => apply("to", e.target.value)}
          className="text-[12px] font-medium text-brand-900 bg-white/70 border border-brand-900/12 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-600/40 transition-colors"
        />
      </div>

      <div className="flex items-center gap-1.5 ml-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-brand-700 hover:text-white text-brand-900/50 hover:text-white"
            style={{ border: "1px solid rgba(13,43,26,0.10)" }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
