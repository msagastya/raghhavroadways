import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { FileText, Plus, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { BillStatus } from "@prisma/client"

const PAGE_SIZE = 25

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "",               label: "All" },
  { value: "DRAFT",          label: "Draft" },
  { value: "GENERATED",      label: "Generated" },
  { value: "SENT",           label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Part Paid" },
  { value: "PAID",           label: "Paid" },
  { value: "CANCELLED",      label: "Cancelled" },
]

async function BillList({ q, status, page }: { q: string; status: string; page: number }) {
  const where = {
    ...(status ? { status: status as BillStatus } : {}),
    ...(q ? {
      OR: [
        { billNumber: { contains: q, mode: "insensitive" as const } },
        { party: { name: { contains: q, mode: "insensitive" as const } } },
        { consignment: { lrNumber: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  }

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: {
        party:       { select: { name: true } },
        consignment: { select: { lrNumber: true, fromCity: true, toCity: true } },
        payments:    { select: { amount: true } },
      },
      orderBy: { billDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bill.count({ where }),
  ])

  if (bills.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No bills found"
        subtitle={q || status ? "Try changing filters" : "Generate your first freight invoice."}
        action={q || status ? undefined : { label: "New Bill", href: "/billing/new" }}
      />
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="tms-table">
        <thead>
          <tr>
            <th>Bill No.</th>
            <th>Party</th>
            <th>GR / Route</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Date</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => {
            const paid    = b.paidAmount
            const balance = +(b.totalAmount - paid).toFixed(2)
            return (
              <tr key={b.id}>
                <td>
                  <Link href={`/billing/${b.id}`}
                        className="font-semibold font-mono text-brand-700 hover:underline">
                    {b.billNumber}
                  </Link>
                </td>
                <td className="font-medium text-brand-900 max-w-[140px] truncate">{b.party.name}</td>
                <td>
                  {b.consignment ? (
                    <div>
                      <p className="font-mono text-[12px] text-brand-700">{b.consignment.lrNumber}</p>
                      <p className="text-[11.5px] text-brand-900/40">
                        {b.consignment.fromCity} → {b.consignment.toCity}
                      </p>
                    </div>
                  ) : (
                    <span className="text-brand-900/35 text-[12px]">—</span>
                  )}
                </td>
                <td className="font-semibold">{formatCurrency(b.totalAmount)}</td>
                <td className="text-green-600 font-medium">{formatCurrency(paid)}</td>
                <td className={`font-semibold ${balance > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {formatCurrency(balance)}
                </td>
                <td><Badge variant={b.status.toLowerCase() as any} /></td>
                <td className="text-brand-900/50 text-[12.5px]">{formatDate(b.billDate)}</td>
                <td>
                  <div className="flex justify-end">
                    <Link href={`/billing/${b.id}`}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-brand-700 hover:text-brand-900 px-2.5 py-1.5 rounded-lg hover:bg-brand-900/5">
                      <Eye size={13} /> View
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
      <Suspense>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  )
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q = "", status = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  // Summary stats
  const [totalDue, totalReceived, overdue] = await Promise.all([
    prisma.bill.aggregate({
      where:   { status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] } },
      _sum:    { totalAmount: true, paidAmount: true },
    }),
    prisma.bill.aggregate({
      where:   { status: "PAID" },
      _sum:    { paidAmount: true },
    }),
    prisma.bill.count({
      where: {
        status:  { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] },
        dueDate: { lt: new Date() },
      },
    }),
  ])

  const outstanding = (totalDue._sum.totalAmount ?? 0) - (totalDue._sum.paidAmount ?? 0)

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Freight invoices and payment tracking"
        actions={
          <Link href="/billing/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} /> New Bill
          </Link>
        }
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Outstanding</p>
          <p className="text-[22px] font-bold text-brand-900 mt-1">{formatCurrency(outstanding)}</p>
          {overdue > 0 && (
            <p className="text-[11.5px] text-red-500 font-semibold mt-0.5">{overdue} overdue</p>
          )}
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Received</p>
          <p className="text-[22px] font-bold text-green-600 mt-1">
            {formatCurrency(totalReceived._sum.paidAmount ?? 0)}
          </p>
          <p className="text-[11.5px] text-brand-900/40 mt-0.5">Fully paid bills</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Partial</p>
          <p className="text-[22px] font-bold text-amber-600 mt-1">
            {formatCurrency(totalDue._sum.paidAmount ?? 0)}
          </p>
          <p className="text-[11.5px] text-brand-900/40 mt-0.5">Received against open bills</p>
        </div>
      </div>

      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-3 flex-wrap">
          <Suspense>
            <SearchBar placeholder="Bill no., party, GR..." />
          </Suspense>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/billing?${new URLSearchParams({ ...(q ? { q } : {}), ...(opt.value ? { status: opt.value } : {}) }).toString()}`}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                  status === opt.value
                    ? "bg-brand-900 text-white border-brand-900"
                    : "bg-white/60 text-brand-900/60 border-brand-900/10 hover:border-brand-900/25 hover:text-brand-900"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        <Suspense fallback={<div className="py-16 text-center text-[13px] text-brand-900/30">Loading...</div>}>
          <BillList q={q} status={status} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
