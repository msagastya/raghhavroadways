import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import RevenueChart from "@/components/reports/RevenueChart"
import StatusPieChart from "@/components/reports/StatusPieChart"
import DateRangeFilter from "@/components/reports/DateRangeFilter"
import { TrendingUp, Package, Building2, Truck, IndianRupee, FileText } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp   = await searchParams
  const now  = new Date()
  const year = now.getFullYear()

  // Date range defaults to current year
  const fromDate = sp.from ? new Date(sp.from) : new Date(year, 0, 1)
  const toDate   = sp.to   ? new Date(sp.to + "T23:59:59") : new Date(year, 11, 31, 23, 59, 59)
  const fromStr  = fromDate.toISOString().split("T")[0]
  const toStr    = toDate.toISOString().split("T")[0]

  // ── Monthly revenue for selected year (always full year for chart) ─────────
  const chartYear = fromDate.getFullYear()
  const monthlyData = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const start = new Date(chartYear, i, 1)
      const end   = new Date(chartYear, i + 1, 0, 23, 59, 59)
      const agg   = await prisma.consignment.aggregate({
        where: {
          bookingDate:  { gte: start, lte: end },
          status:       { not: "CANCELLED" },
        },
        _sum:   { freightAmount: true },
        _count: { id: true },
      })
      return {
        month:    start.toLocaleString("en-IN", { month: "short" }),
        revenue:  agg._sum.freightAmount ?? 0,
        count:    agg._count.id,
      }
    })
  )

  // ── Consignment status breakdown (filtered by date range) ─────────────────
  const statusGroups = await prisma.consignment.groupBy({
    by:    ["status"],
    where: { bookingDate: { gte: fromDate, lte: toDate } },
    _count: { id: true },
  })

  // ── Top 10 parties by revenue (filtered by date range) ───────────────────
  const topParties = await prisma.consignment.groupBy({
    by:      ["consignorId"],
    where:   { status: { not: "CANCELLED" }, bookingDate: { gte: fromDate, lte: toDate } },
    _sum:    { freightAmount: true },
    _count:  { id: true },
    orderBy: { _sum: { freightAmount: "desc" } },
    take: 10,
  })

  const topPartyIds  = topParties.map((p) => p.consignorId)
  const topPartyInfo = await prisma.party.findMany({
    where:  { id: { in: topPartyIds } },
    select: { id: true, name: true },
  })
  const partyMap = Object.fromEntries(topPartyInfo.map((p) => [p.id, p.name]))

  // ── Overdue bills ─────────────────────────────────────────────────────────
  const overdueBills = await prisma.bill.findMany({
    where: {
      status:  { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    include: { party: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
    take: 20,
  })

  // ── Vehicle utilization ───────────────────────────────────────────────────
  const vehicles = await prisma.vehicle.findMany({
    where:   { isActive: true },
    include: {
      _count:      { select: { consignments: true } },
      owner:       { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  })

  // ── Summary totals (filtered by date range) ───────────────────────────────
  const [totalRevenue, totalPaid, totalOutstanding, totalConsignments] = await Promise.all([
    prisma.consignment.aggregate({
      where: { status: { not: "CANCELLED" }, bookingDate: { gte: fromDate, lte: toDate } },
      _sum:  { freightAmount: true },
    }),
    prisma.bill.aggregate({
      where: { status: "PAID", billDate: { gte: fromDate, lte: toDate } },
      _sum:  { totalAmount: true },
    }),
    prisma.bill.aggregate({
      where: { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
      _sum:  { totalAmount: true, paidAmount: true },
    }),
    prisma.consignment.count({ where: { status: { not: "CANCELLED" }, bookingDate: { gte: fromDate, lte: toDate } } }),
  ])

  const outstanding = (totalOutstanding._sum.totalAmount ?? 0) - (totalOutstanding._sum.paidAmount ?? 0)

  const statusColors: Record<string, string> = {
    BOOKED:         "#3b82f6",
    IN_TRANSIT:     "#f59e0b",
    DELIVERED:      "#10b981",
    BILLED:         "#8b5cf6",
    PARTIALLY_PAID: "#f97316",
    PAID:           "#16a34a",
    CANCELLED:      "#ef4444",
  }
  const statusLabels: Record<string, string> = {
    BOOKED: "Booked", IN_TRANSIT: "In Transit", DELIVERED: "Delivered",
    BILLED: "Billed", PARTIALLY_PAID: "Part Paid", PAID: "Paid", CANCELLED: "Cancelled",
  }

  const pieData = statusGroups.map((g) => ({
    name:  statusLabels[g.status] ?? g.status,
    value: g._count.id,
    color: statusColors[g.status] ?? "#888",
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Business overview and analytics"
      />

      {/* Date range filter */}
      <DateRangeFilter from={fromStr} to={toStr} />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(totalRevenue._sum.freightAmount ?? 0),
            icon: TrendingUp,
            color: "text-brand-700",
            bg:    "bg-brand-50",
          },
          {
            label: "Total Collected",
            value: formatCurrency(totalPaid._sum.totalAmount ?? 0),
            icon: IndianRupee,
            color: "text-green-600",
            bg:    "bg-green-50",
          },
          {
            label: "Outstanding",
            value: formatCurrency(outstanding),
            icon: FileText,
            color: "text-amber-600",
            bg:    "bg-amber-50",
          },
          {
            label: "Total Trips",
            value: String(totalConsignments),
            icon: Package,
            color: "text-violet-600",
            bg:    "bg-violet-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-900/50 mb-1">{label}</p>
                <p className="text-[22px] font-bold text-brand-900">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={20} strokeWidth={1.7} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly revenue bar chart */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Monthly Revenue — {chartYear}</span>
          </div>
          <RevenueChart data={monthlyData} />
        </GlassCard>

        {/* Status pie chart */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-5">
            <Package size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Consignment Status</span>
          </div>
          <StatusPieChart data={pieData} />
        </GlassCard>
      </div>

      {/* Top parties + Vehicle utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top parties */}
        <GlassCard padding={false}>
          <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-2">
            <Building2 size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Top Consignors by Revenue</span>
          </div>
          {topParties.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-brand-900/35">No data yet</div>
          ) : (
            <div className="divide-y divide-brand-900/5">
              {topParties.map((p, i) => {
                const rev = p._sum.freightAmount ?? 0
                const maxRev = topParties[0]._sum.freightAmount ?? 1
                return (
                  <div key={p.consignorId} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-[13px] font-bold text-brand-900/30 w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-brand-900 truncate">
                        {partyMap[p.consignorId] ?? "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-brand-900/8">
                          <div
                            className="h-full rounded-full bg-brand-700"
                            style={{ width: `${(rev / maxRev) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11.5px] text-brand-900/45 shrink-0">{p._count.id} trips</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-brand-900 shrink-0">{formatCurrency(rev)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Vehicle utilization */}
        <GlassCard padding={false}>
          <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-2">
            <Truck size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Vehicle Utilization</span>
          </div>
          {vehicles.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-brand-900/35">No vehicles yet</div>
          ) : (
            <div className="divide-y divide-brand-900/5">
              {vehicles.map((v) => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold font-mono text-brand-900">{v.vehicleNumber}</p>
                    <p className="text-[11.5px] text-brand-900/45 mt-0.5">{v.owner.name} · {v.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-brand-900">{v._count.consignments} trips</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      v.status === "ON_TRIP"   ? "bg-amber-50 text-amber-700" :
                      v.status === "IN_REPAIR" ? "bg-red-50 text-red-600" :
                      v.status === "INACTIVE"  ? "bg-gray-50 text-gray-500" :
                      "bg-green-50 text-green-700"
                    }`}>
                      {v.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Overdue bills */}
      {overdueBills.length > 0 && (
        <GlassCard padding={false}>
          <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-2">
            <FileText size={15} strokeWidth={1.8} className="text-red-500" />
            <span className="text-[13px] font-bold text-brand-900">Overdue Bills</span>
            <span className="ml-auto text-[12px] font-semibold text-red-500">{overdueBills.length} overdue</span>
          </div>
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Party</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {overdueBills.map((b) => {
                  const balance    = b.totalAmount - b.paidAmount
                  const daysOver   = Math.floor((now.getTime() - (b.dueDate?.getTime() ?? 0)) / 86400000)
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/billing/${b.id}`}
                              className="font-mono font-semibold text-brand-700 hover:underline">
                          {b.billNumber}
                        </Link>
                      </td>
                      <td className="font-medium">{b.party.name}</td>
                      <td>{formatCurrency(b.totalAmount)}</td>
                      <td className="font-semibold text-amber-600">{formatCurrency(balance)}</td>
                      <td className="text-red-500">{b.dueDate ? formatDate(b.dueDate) : "—"}</td>
                      <td>
                        <span className="font-bold text-red-500">{daysOver}d</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
