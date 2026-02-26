import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import VehiclePaymentFormWrapper from "@/components/billing/VehiclePaymentFormWrapper"
import { Truck, Plus, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

async function VehiclePaymentList({ q }: { q: string }) {
  const payments = await prisma.vehiclePayment.findMany({
    where: q ? {
      OR: [
        { party:       { name: { contains: q, mode: "insensitive" } } },
        { consignment: { lrNumber: { contains: q, mode: "insensitive" } } },
        { reference:   { contains: q, mode: "insensitive" } },
      ],
    } : {},
    include: {
      party:       { select: { id: true, name: true } },
      consignment: { select: { id: true, lrNumber: true, fromCity: true, toCity: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  })

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No vehicle payments"
        subtitle={q ? "Try changing the search" : "Record payments to vehicle owners here."}
      />
    )
  }

  return (
    <div>
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-brand-900/5">
        {payments.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[12px] text-brand-900/50">{formatDate(p.date)}</span>
                <span className="text-[14px] font-bold text-brand-900">{formatCurrency(p.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-brand-700">
                  {p.consignment ? p.consignment.lrNumber : "—"}
                </span>
                <span className="text-[12px] text-brand-900/55 truncate">{p.party.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${
                  p.type === "ADVANCE" ? "text-amber-700 bg-amber-50" :
                  p.type === "BALANCE" ? "text-green-700 bg-green-50" :
                  "text-blue-700 bg-blue-50"
                }`}>{p.type}</span>
                <span className="text-[11.5px] text-brand-900/45">{p.mode}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="tms-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vehicle Owner</th>
              <th>GR / Trip</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="text-brand-900/50 text-[12.5px]">{formatDate(p.date)}</td>
                <td>
                  <Link href={`/parties/vehicle-owners/${p.party.id}`}
                        className="font-medium text-brand-700 hover:underline">
                    {p.party.name}
                  </Link>
                </td>
                <td>
                  {p.consignment ? (
                    <div>
                      <Link href={`/consignments/${p.consignment.id}`}
                            className="font-mono text-[12px] text-brand-700 hover:underline">
                        {p.consignment.lrNumber}
                      </Link>
                      <p className="text-[11.5px] text-brand-900/40">
                        {p.consignment.fromCity} → {p.consignment.toCity}
                      </p>
                    </div>
                  ) : (
                    <span className="text-brand-900/35 text-[12px]">—</span>
                  )}
                </td>
                <td>
                  <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                    p.type === "ADVANCE" ? "text-amber-700 bg-amber-50" :
                    p.type === "BALANCE" ? "text-green-700 bg-green-50" :
                    "text-blue-700 bg-blue-50"
                  }`}>
                    {p.type}
                  </span>
                </td>
                <td className="font-semibold text-brand-900">{formatCurrency(p.amount)}</td>
                <td className="text-brand-900/60 text-[12.5px]">{p.mode}</td>
                <td className="font-mono text-[12px] text-brand-900/50">{p.reference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-brand-900/35 px-4 py-3 text-right">
        {payments.length} payment{payments.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}

export default async function VehiclePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams

  // Totals
  const totals = await prisma.vehiclePayment.groupBy({
    by: ["type"],
    _sum: { amount: true },
  })
  const total = (type: string) => totals.find((t) => t.type === type)?._sum.amount ?? 0

  // For the record-payment form
  const [vehicleOwners, consignments] = await Promise.all([
    prisma.party.findMany({
      where:   { type: "VEHICLE_OWNER", isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.consignment.findMany({
      where:   { status: { in: ["BOOKED", "IN_TRANSIT", "DELIVERED", "BILLED"] } },
      select:  { id: true, lrNumber: true, fromCity: true, toCity: true,
                 vehicleFreight: true, advancePaid: true, balancePaid: true },
      orderBy: { bookingDate: "desc" },
      take: 100,
    }),
  ])

  return (
    <div>
      <PageHeader
        title="Vehicle Payments"
        subtitle="Track advance & balance payments to vehicle owners"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Advances Paid</p>
          <p className="text-[22px] font-bold text-amber-600 mt-1">{formatCurrency(total("ADVANCE"))}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Balance Paid</p>
          <p className="text-[22px] font-bold text-green-600 mt-1">{formatCurrency(total("BALANCE"))}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Total Out</p>
          <p className="text-[22px] font-bold text-brand-900 mt-1">
            {formatCurrency(total("ADVANCE") + total("BALANCE") + total("EXTRA"))}
          </p>
        </div>
      </div>

      {/* Record new payment */}
      <GlassCard className="mb-5">
        <p className="text-[13px] font-bold text-brand-900 mb-3">Record Vehicle Payment</p>
        <VehiclePaymentFormWrapper vehicleOwners={vehicleOwners} consignments={consignments} />
      </GlassCard>

      {/* List */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <Suspense>
            <SearchBar placeholder="Owner name, GR number, reference..." />
          </Suspense>
        </div>
        <Suspense fallback={<div className="py-16 text-center text-[13px] text-brand-900/30">Loading...</div>}>
          <VehiclePaymentList q={q} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
