"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Props {
  data: { name: string; value: number; color: string }[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg text-[12px]"
         style={{ background: "#0D2B1A", color: "white" }}>
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-white/80">{payload[0].value} consignment{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center">
      {payload?.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-[11px] font-semibold text-brand-900/55">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatusPieChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[13px] text-brand-900/30">
        No consignment data yet
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[22px] font-bold text-brand-900">{total}</p>
          <p className="text-[10px] font-semibold text-brand-900/40 uppercase tracking-wider">Total</p>
        </div>
      </div>
      <CustomLegend payload={data.map((d) => ({ value: d.name, color: d.color }))} />
    </div>
  )
}
