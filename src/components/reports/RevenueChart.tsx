"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"

interface Props {
  data: { month: string; revenue: number; count: number }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 shadow-lg text-[13px]"
         style={{ background: "#0D2B1A", color: "white", border: "none" }}>
      <p className="font-bold mb-1">{label}</p>
      <p className="text-white/80">
        Revenue: <span className="font-semibold text-white">
          ₹{(payload[0].value as number).toLocaleString("en-IN")}
        </span>
      </p>
      <p className="text-white/80">
        Trips: <span className="font-semibold text-white">{payload[0].payload.count}</span>
      </p>
    </div>
  )
}

export default function RevenueChart({ data }: Props) {
  const hasData = data.some((d) => d.revenue > 0)

  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[13px] text-brand-900/30">
        No consignment data for this year yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,43,26,0.07)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "rgba(13,43,26,0.45)", fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(13,43,26,0.35)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(13,43,26,0.04)", radius: 6 }} />
        <Bar
          dataKey="revenue"
          fill="#0D2B1A"
          radius={[5, 5, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
