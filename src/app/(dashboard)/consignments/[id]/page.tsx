import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import StatusUpdateButton from "@/components/consignments/StatusUpdateButton"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Building2, UserCheck, KeyRound, Truck, MapPin, Package,
  IndianRupee, FileText, Pencil, ArrowRight, CheckCircle2, Clock, Receipt,
} from "lucide-react"
import { ConsignmentStatus } from "@prisma/client"

const STATUS_FLOW: ConsignmentStatus[] = [
  "BOOKED", "IN_TRANSIT", "DELIVERED", "BILLED", "PAID",
]

const STATUS_ICONS: Record<string, React.ReactNode> = {
  BOOKED:         <CheckCircle2 size={14} />,
  IN_TRANSIT:     <Truck size={14} />,
  DELIVERED:      <CheckCircle2 size={14} />,
  BILLED:         <FileText size={14} />,
  PARTIALLY_PAID: <IndianRupee size={14} />,
  PAID:           <CheckCircle2 size={14} />,
  CANCELLED:      <Clock size={14} />,
}

function isReached(current: ConsignmentStatus, step: ConsignmentStatus) {
  if (current === "CANCELLED") return false
  if (current === "PARTIALLY_PAID") {
    const partialIdx = STATUS_FLOW.indexOf("PAID")
    const stepIdx    = STATUS_FLOW.indexOf(step)
    return stepIdx < partialIdx
  }
  return STATUS_FLOW.indexOf(current) >= STATUS_FLOW.indexOf(step)
}

export default async function ConsignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const c = await prisma.consignment.findUnique({
    where: { id },
    include: {
      consignor: { select: { id: true, name: true, phone: true, type: true } },
      consignee: { select: { id: true, name: true, phone: true, type: true } },
      agent:     { select: { id: true, name: true, phone: true } },
      vehicle:   { include: { owner: { select: { id: true, name: true, phone: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!c) notFound()

  const balanceDue = (c.vehicleFreight ?? 0) - c.advancePaid - c.balancePaid
  const partyPath = (type: string, pid: string) => {
    const map: Record<string, string> = {
      COMPANY: "companies", AGENT: "agents", VEHICLE_OWNER: "vehicle-owners"
    }
    return `/parties/${map[type] ?? "companies"}/${pid}`
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={c.lrNumber}
        subtitle={`${c.fromCity} → ${c.toCity} · Booked ${formatDate(c.bookingDate)}`}
        backHref="/consignments"
        backLabel="Back to Consignments"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={c.status.toLowerCase() as any} className="px-3 py-1 text-[13px]" />
            {c.status === "DELIVERED" && (
              <Link href={`/billing/new?consignmentId=${c.id}`} className="btn-primary text-[13px]"
                    style={{ padding: "7px 14px" }}>
                <Receipt size={14} /> Generate Bill
              </Link>
            )}
            <Link href={`/consignments/${c.id}/edit`} className="btn-outline text-[13px]"
                  style={{ padding: "7px 14px" }}>
              <Pencil size={14} /> Edit
            </Link>
          </div>
        }
      />

      {/* Route banner */}
      <div className="glass rounded-2xl px-6 py-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40 mb-1">From</p>
            <p className="text-[20px] font-bold text-brand-900">{c.fromCity}</p>
            <p className="text-[12px] text-brand-900/50">{c.fromState}</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-w-[80px]">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 h-px bg-brand-900/15" />
              <ArrowRight size={18} className="text-brand-900/30 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 h-px bg-brand-900/15" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40 mb-1">To</p>
            <p className="text-[20px] font-bold text-brand-900">{c.toCity}</p>
            <p className="text-[12px] text-brand-900/50">{c.toState}</p>
          </div>
          <div className="ml-auto flex gap-3 flex-wrap">
            <Chip label="Type"    value={c.freightType === "WEIGHT_BASIS" ? "Weight Basis" : c.freightType} />
            <Chip label="Payment" value={c.paymentType === "TBB" ? "TBB" : c.paymentType === "TO_PAY" ? "To Pay" : "Paid"} />
            {c.ewayBillNumber && <Chip label="EWB No." value={c.ewayBillNumber} mono />}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cargo */}
        <GlassCard>
          <SectionH icon={Package} title="Cargo Details" />
          <div className="space-y-3 mt-4">
            <Row label="Description"  value={c.description} />
            {c.weight         && <Row label="Weight"      value={`${c.weight.toLocaleString()} KG`} />}
            {c.quantity       && <Row label="Quantity"    value={`${c.quantity} ${c.unit ?? ""}`} />}
            {c.declaredValue  && <Row label="Decl. Value" value={formatCurrency(c.declaredValue)} />}
          </div>
        </GlassCard>

        {/* Parties */}
        <GlassCard>
          <SectionH icon={Building2} title="Parties" />
          <div className="space-y-4 mt-4">
            <PartyRow label="Consignor" party={c.consignor} href={partyPath(c.consignor.type, c.consignor.id)} />
            <PartyRow label="Consignee" party={c.consignee} href={partyPath(c.consignee.type, c.consignee.id)} />
            {c.agent && <PartyRow label="Agent" party={c.agent} href={`/parties/agents/${c.agent.id}`} />}
          </div>
        </GlassCard>

        {/* Financials */}
        <GlassCard>
          <SectionH icon={IndianRupee} title="Freight Financials" />
          <div className="space-y-3 mt-4">
            <Row label="Freight Amount" value={formatCurrency(c.freightAmount)} bold />
            {c.vehicleFreight && (
              <>
                <div className="h-px bg-brand-900/6" />
                <Row label="Vehicle Freight" value={formatCurrency(c.vehicleFreight)} />
                <Row label="Advance Paid"    value={formatCurrency(c.advancePaid)} />
                <Row label="Balance Paid"    value={formatCurrency(c.balancePaid)} />
                <Row
                  label="Balance Due"
                  value={formatCurrency(balanceDue)}
                  bold
                  valueClass={balanceDue > 0 ? "text-amber-600" : "text-green-600"}
                />
              </>
            )}
          </div>
        </GlassCard>

        {/* Vehicle */}
        <GlassCard>
          <SectionH icon={Truck} title="Vehicle Assignment" />
          {c.vehicle ? (
            <div className="space-y-3 mt-4">
              <Row label="Vehicle No." value={c.vehicle.vehicleNumber} mono />
              <Row label="Type"        value={c.vehicle.type} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/35">Owner</p>
                <Link href={`/parties/vehicle-owners/${c.vehicle.owner.id}`}
                      className="font-semibold text-brand-700 hover:underline text-[13.5px] mt-0.5 block">
                  {c.vehicle.owner.name}
                </Link>
              </div>
              {c.driverName  && <Row label="Driver"       value={c.driverName} />}
              {c.driverPhone && <Row label="Driver Phone" value={c.driverPhone} />}
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl text-[13px] text-brand-900/40 text-center"
                 style={{ background: "rgba(13,43,26,0.04)", border: "1px dashed rgba(13,43,26,0.15)" }}>
              No vehicle assigned yet
            </div>
          )}
        </GlassCard>
      </div>

      {/* Status Timeline */}
      <GlassCard>
        <SectionH icon={Clock} title="Status Timeline" />
        <div className="mt-5 flex items-start gap-0">
          {STATUS_FLOW.map((step, i) => {
            const reached  = isReached(c.status, step)
            const isCurrent = c.status === step ||
              (c.status === "PARTIALLY_PAID" && step === "PAID")
            const log = c.statusHistory.find((l) => l.status === step)

            return (
              <div key={step} className="flex-1 relative">
                {/* Connector */}
                {i < STATUS_FLOW.length - 1 && (
                  <div className="absolute top-3.5 left-1/2 right-0 h-0.5 -translate-y-1/2 z-0"
                       style={{ background: reached && !isCurrent ? "#0D2B1A" : "rgba(13,43,26,0.12)" }} />
                )}

                <div className="relative z-10 flex flex-col items-center text-center px-1">
                  {/* Dot */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 text-[11px] border-2 transition-all ${
                    isCurrent
                      ? "bg-brand-900 border-brand-900 text-white scale-110"
                      : reached
                      ? "bg-brand-700 border-brand-700 text-white"
                      : "bg-white border-brand-900/20 text-brand-900/25"
                  }`}>
                    {STATUS_ICONS[step]}
                  </div>
                  <p className={`text-[11px] font-bold leading-tight ${
                    isCurrent ? "text-brand-900" : reached ? "text-brand-700" : "text-brand-900/30"
                  }`}>
                    {step === "IN_TRANSIT" ? "In Transit" :
                     step.charAt(0) + step.slice(1).toLowerCase().replace("_", " ")}
                  </p>
                  {log && (
                    <p className="text-[10px] text-brand-900/35 mt-0.5 leading-tight">
                      {formatDate(log.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {c.status === "CANCELLED" && (
          <div className="mt-4 p-3 rounded-xl text-[13px] font-semibold text-center text-red-500"
               style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.15)" }}>
            This consignment has been cancelled
          </div>
        )}
      </GlassCard>

      {/* Notes */}
      {c.notes && (
        <GlassCard>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40 mb-2">Notes</p>
          <p className="text-[13.5px] text-brand-900/70 leading-relaxed">{c.notes}</p>
        </GlassCard>
      )}

      {/* Status Update actions */}
      {c.status !== "PAID" && c.status !== "CANCELLED" && (
        <GlassCard>
          <p className="text-[13px] font-bold text-brand-900 mb-3">Update Status</p>
          <StatusUpdateButton consignmentId={c.id} currentStatus={c.status} />
        </GlassCard>
      )}
    </div>
  )
}

function Chip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-3 py-2 rounded-xl text-center"
         style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-900/35">{label}</p>
      <p className={`text-[13px] font-bold text-brand-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

function SectionH({ icon: Icon, title }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} strokeWidth={1.8} className="text-brand-900/50" />
      <span className="text-[13px] font-bold text-brand-900">{title}</span>
    </div>
  )
}

function Row({ label, value, bold, mono, valueClass }: {
  label: string; value: string; bold?: boolean; mono?: boolean; valueClass?: string
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-[12.5px] text-brand-900/45 shrink-0">{label}</span>
      <span className={`text-[13.5px] text-right ${bold ? "font-bold text-brand-900" : "font-medium text-brand-900"} ${mono ? "font-mono" : ""} ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  )
}

function PartyRow({ label, party, href }: {
  label: string
  party: { name: string; phone: string | null }
  href: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/35">{label}</p>
        <Link href={href} className="font-semibold text-brand-700 hover:underline text-[13.5px] mt-0.5 block">
          {party.name}
        </Link>
        {party.phone && (
          <p className="text-[12px] text-brand-900/40 mt-0.5">{party.phone}</p>
        )}
      </div>
    </div>
  )
}
