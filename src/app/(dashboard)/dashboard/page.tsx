import { prisma } from "@/lib/prisma"
import StatCard from "@/components/ui/StatCard"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  PackageSearch, Receipt, IndianRupee, Truck,
  AlertTriangle, Clock, CheckCircle2, ArrowRight,
  FileText, TrendingUp,
} from "lucide-react"
import Link from "next/link"

export const revalidate = 30

export default async function DashboardPage() {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    activeTrips,
    pendingBills,
    outstandingAgg,
    thisMonthAgg,
    lastMonthAgg,
    recentConsignments,
    overdueBills,
    expiringDocs,
    openIncidents,
    todayBooked,
  ] = await Promise.all([
    // Active trips (IN_TRANSIT)
    prisma.consignment.count({ where: { status: "IN_TRANSIT" } }),

    // Pending bills count
    prisma.bill.count({ where: { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } } }),

    // Outstanding amount
    prisma.bill.aggregate({
      where: { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
      _sum:  { totalAmount: true, paidAmount: true },
    }),

    // This month revenue
    prisma.consignment.aggregate({
      where: {
        bookingDate:  { gte: monthStart },
        status:       { not: "CANCELLED" },
      },
      _sum: { freightAmount: true },
    }),

    // Last month revenue (for trend)
    prisma.consignment.aggregate({
      where: {
        bookingDate: { gte: lastMonth, lte: lastMonthEnd },
        status:      { not: "CANCELLED" },
      },
      _sum: { freightAmount: true },
    }),

    // Recent 8 consignments
    prisma.consignment.findMany({
      orderBy: { bookingDate: "desc" },
      take: 8,
      include: {
        consignor: { select: { name: true } },
      },
    }),

    // Overdue bills
    prisma.bill.findMany({
      where: {
        status:  { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: now },
      },
      include: { party: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // Expiring vehicle docs (next 30 days)
    prisma.vehicleDocument.findMany({
      where: {
        expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
      },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),

    // Open incidents
    prisma.vehicleIncident.count({ where: { status: "OPEN" } }),

    // Consignments booked today
    prisma.consignment.count({
      where: {
        bookingDate: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    }),
  ])

  const outstanding = (outstandingAgg._sum.totalAmount ?? 0) - (outstandingAgg._sum.paidAmount ?? 0)
  const thisMonth   = thisMonthAgg._sum.freightAmount ?? 0
  const lastMonthV  = lastMonthAgg._sum.freightAmount ?? 0
  const trendPct    = lastMonthV > 0 ? Math.round(((thisMonth - lastMonthV) / lastMonthV) * 100) : null

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Trips"
          value={String(activeTrips)}
          subtitle="Consignments in transit"
          icon={Truck}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          delay={0}
        />
        <StatCard
          title="Pending Bills"
          value={String(pendingBills)}
          subtitle="Awaiting payment"
          icon={Receipt}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          delay={60}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(outstanding)}
          subtitle="Total receivables due"
          icon={IndianRupee}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          delay={120}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(thisMonth)}
          subtitle="Freight revenue"
          icon={TrendingUp}
          iconBg="bg-brand-50"
          iconColor="text-brand-700"
          delay={180}
          trend={trendPct !== null ? {
            value: `${Math.abs(trendPct)}%`,
            positive: trendPct >= 0,
            label: " vs last month",
          } : undefined}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Consignments */}
        <GlassCard padding={false} className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
            <div>
              <h2 className="text-[15px] font-bold text-brand-900">Recent Consignments</h2>
              <p className="text-[12px] text-brand-900/45 mt-0.5">Latest bookings and status</p>
            </div>
            <Link href="/consignments"
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900 transition-colors">
              View all <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

          {recentConsignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                   style={{ background: "rgba(13,43,26,0.05)" }}>
                <PackageSearch size={26} strokeWidth={1.5} className="text-brand-900/30" />
              </div>
              <p className="text-[14px] font-semibold text-brand-900/40">No consignments yet</p>
              <p className="text-[12.5px] text-brand-900/30 mt-1">Book your first consignment to see it here</p>
              <Link href="/consignments/new" className="btn-primary mt-4 text-[13px]"
                    style={{ padding: "8px 16px" }}>
                New Consignment
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tms-table">
                <thead>
                  <tr>
                    <th>GR No.</th>
                    <th>Route</th>
                    <th>Party</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConsignments.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/consignments/${c.id}`}
                              className="font-semibold font-mono text-brand-700 hover:underline">
                          {c.lrNumber}
                        </Link>
                      </td>
                      <td>
                        <span className="text-brand-900">{c.fromCity}</span>
                        <span className="text-brand-900/35 mx-1">→</span>
                        <span className="text-brand-900">{c.toCity}</span>
                      </td>
                      <td className="text-brand-900/70 truncate max-w-[120px]">{c.consignor.name}</td>
                      <td className="font-semibold">{formatCurrency(c.freightAmount)}</td>
                      <td><Badge variant={c.status.toLowerCase() as any} /></td>
                      <td className="text-brand-900/50">{formatDate(c.bookingDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Alerts + Quick Actions */}
        <GlassCard padding={false} className="overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-900/6">
            <h2 className="text-[15px] font-bold text-brand-900">Alerts</h2>
            <p className="text-[12px] text-brand-900/45 mt-0.5">Items needing attention</p>
          </div>

          <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
            {overdueBills.length === 0 && expiringDocs.length === 0 && openIncidents === 0 ? (
              <div className="flex items-start gap-3 p-3 rounded-xl border bg-green-50 border-green-100">
                <CheckCircle2 size={16} strokeWidth={2} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-brand-900">All clear!</p>
                  <p className="text-[12px] text-brand-900/55 mt-0.5">No alerts at this time.</p>
                </div>
              </div>
            ) : (
              <>
                {overdueBills.map((b) => (
                  <Link key={b.id} href={`/billing/${b.id}`}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-red-50 border-red-100 hover:bg-red-100 transition-colors block">
                    <FileText size={16} strokeWidth={2} className="text-red-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-brand-900 leading-tight">
                        Overdue: {b.party.name}
                      </p>
                      <p className="text-[12px] text-brand-900/55 mt-0.5">
                        {formatCurrency(b.totalAmount - b.paidAmount)} due · {b.billNumber}
                      </p>
                    </div>
                  </Link>
                ))}
                {expiringDocs.map((d) => (
                  <Link key={d.id} href={`/vehicles/${d.vehicleId}`}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-amber-50 border-amber-100 hover:bg-amber-100 transition-colors block">
                    <AlertTriangle size={16} strokeWidth={2} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-brand-900 leading-tight">
                        Doc expiring: {d.vehicle.vehicleNumber}
                      </p>
                      <p className="text-[12px] text-brand-900/55 mt-0.5">
                        {d.type} · {d.expiryDate ? formatDate(d.expiryDate) : ""}
                      </p>
                    </div>
                  </Link>
                ))}
                {openIncidents > 0 && (
                  <Link href="/vehicles"
                        className="flex items-start gap-3 p-3 rounded-xl border bg-amber-50 border-amber-100 hover:bg-amber-100 transition-colors block">
                    <AlertTriangle size={16} strokeWidth={2} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-brand-900">{openIncidents} open incident{openIncidents !== 1 ? "s" : ""}</p>
                      <p className="text-[12px] text-brand-900/55 mt-0.5">Vehicle incidents unresolved</p>
                    </div>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-5 py-4 border-t border-brand-900/6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-900/35 mb-3">Quick Actions</p>
            {[
              { href: "/consignments/new", icon: PackageSearch, label: "New Consignment" },
              { href: "/billing/new",      icon: Receipt,       label: "Generate Bill" },
              { href: "/parties/companies/new", icon: Clock,   label: "Add Party" },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-brand-900/4 group"
                    style={{ border: "1px solid rgba(13,43,26,0.08)" }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="text-brand-700" />
                  <span className="text-[13px] font-medium text-brand-900">{label}</span>
                </div>
                <ArrowRight size={13} className="text-brand-900/30 group-hover:text-brand-700 transition-colors" />
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Booked Today",       value: todayBooked,    color: "text-brand-900" },
          { label: "Active Trips",        value: activeTrips,    color: "text-amber-600" },
          { label: "Open Incidents",      value: openIncidents,  color: openIncidents > 0 ? "text-red-500" : "text-green-600" },
          { label: "Pending Bills",       value: pendingBills,   color: pendingBills > 0 ? "text-violet-600" : "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center">
            <p className={`text-[28px] font-bold ${color}`}>{value}</p>
            <p className="text-[11.5px] font-semibold text-brand-900/45 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
