import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { PackageSearch, Plus, Eye, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ConsignmentStatus } from "@prisma/client"

const PAGE_SIZE = 25

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "",              label: "All Status" },
  { value: "BOOKED",        label: "Booked" },
  { value: "IN_TRANSIT",    label: "In Transit" },
  { value: "DELIVERED",     label: "Delivered" },
  { value: "BILLED",        label: "Billed" },
  { value: "PARTIALLY_PAID",label: "Part Paid" },
  { value: "PAID",          label: "Paid" },
  { value: "CANCELLED",     label: "Cancelled" },
]

async function ConsignmentList({ q, status, page }: { q: string; status: string; page: number }) {
  const where = {
    ...(status ? { status: status as ConsignmentStatus } : {}),
    ...(q ? {
      OR: [
        { lrNumber:   { contains: q, mode: "insensitive" as const } },
        { consignor:  { name: { contains: q, mode: "insensitive" as const } } },
        { consignee:  { name: { contains: q, mode: "insensitive" as const } } },
        { fromCity:   { contains: q, mode: "insensitive" as const } },
        { toCity:     { contains: q, mode: "insensitive" as const } },
        { description:{ contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [consignments, total] = await Promise.all([
    prisma.consignment.findMany({
      where,
      include: {
        consignor: { select: { name: true } },
        consignee: { select: { name: true } },
        vehicle:   { select: { vehicleNumber: true } },
      },
      orderBy: { bookingDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.consignment.count({ where }),
  ])

  if (consignments.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No consignments found"
        subtitle={q || status ? "Try changing filters" : "Book your first consignment to get started."}
        action={q || status ? undefined : { label: "New Consignment", href: "/consignments/new" }}
      />
    )
  }

  return (
    <div>
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-brand-900/5">
        {consignments.map((c) => (
          <Link href={`/consignments/${c.id}`} key={c.id}
                className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-brand-900/3 active:bg-brand-900/5 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold font-mono text-[13px] text-brand-700">{c.lrNumber}</span>
                <Badge variant={c.status.toLowerCase() as any} />
              </div>
              <p className="text-[13px] font-medium text-brand-900 truncate">{c.consignor.name}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[12px] text-brand-900/55">{c.fromCity} → {c.toCity}</span>
                <span className="text-[13px] font-bold text-brand-900">{formatCurrency(c.freightAmount)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11.5px] text-brand-900/40">{formatDate(c.bookingDate)}</span>
                <Badge variant={
                  c.paymentType === "PAID" ? "paid" :
                  c.paymentType === "TO_PAY" ? "info" : "neutral"
                } label={c.paymentType === "TBB" ? "TBB" : c.paymentType === "TO_PAY" ? "To Pay" : "Paid"} />
              </div>
            </div>
            <ChevronRight size={16} className="text-brand-900/25 shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="tms-table">
          <thead>
            <tr>
              <th>GR No.</th>
              <th>Consignor</th>
              <th>Route</th>
              <th>Type</th>
              <th>Freight (₹)</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {consignments.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/consignments/${c.id}`}
                        className="font-semibold font-mono text-brand-700 hover:underline">
                    {c.lrNumber}
                  </Link>
                </td>
                <td>
                  <div>
                    <p className="font-medium text-brand-900 truncate max-w-[140px]">{c.consignor.name}</p>
                    <p className="text-[11.5px] text-brand-900/40 truncate max-w-[140px]">→ {c.consignee.name}</p>
                  </div>
                </td>
                <td>
                  <span className="font-medium">{c.fromCity}</span>
                  <span className="text-brand-900/35 mx-1 text-[11px]">→</span>
                  <span className="font-medium">{c.toCity}</span>
                </td>
                <td>
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(13,43,26,0.06)", color: "#0D2B1A" }}>
                    {c.freightType === "WEIGHT_BASIS" ? "Wt." : c.freightType}
                  </span>
                </td>
                <td className="font-semibold">{formatCurrency(c.freightAmount)}</td>
                <td>
                  <Badge variant={
                    c.paymentType === "PAID" ? "paid" :
                    c.paymentType === "TO_PAY" ? "info" : "neutral"
                  } label={c.paymentType === "TBB" ? "TBB" : c.paymentType === "TO_PAY" ? "To Pay" : "Paid"} />
                </td>
                <td><Badge variant={c.status.toLowerCase() as any} /></td>
                <td className="text-brand-900/50 text-[12.5px]">{formatDate(c.bookingDate)}</td>
                <td>
                  <div className="flex justify-end">
                    <Link href={`/consignments/${c.id}`}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-brand-700 hover:text-brand-900 px-2.5 py-1.5 rounded-lg hover:bg-brand-900/5">
                      <Eye size={13} /> View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Suspense>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  )
}

export default async function ConsignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q = "", status = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  return (
    <div>
      <PageHeader
        title="Consignments"
        subtitle="All bookings from order to payment"
        actions={
          <Link href="/consignments/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} /> New Consignment
          </Link>
        }
      />

      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-3 flex-wrap">
          <Suspense>
            <SearchBar placeholder="GR no., party, city, cargo..." />
          </Suspense>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/consignments?${new URLSearchParams({ ...(q ? { q } : {}), ...(opt.value ? { status: opt.value } : {}) }).toString()}`}
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
          <ConsignmentList q={q} status={status} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
