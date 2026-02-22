import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Phone, Mail, MapPin, KeyRound, CreditCard, Truck, Wrench, Pencil, ArrowRight, Plus } from "lucide-react"
import ToggleActiveButton from "@/components/parties/ToggleActiveButton"

export default async function VehicleOwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const owner = await prisma.party.findUnique({
    where: { id, type: "VEHICLE_OWNER" },
    include: {
      vehicles: {
        where: { isActive: true },
        include: { _count: { select: { consignments: true } } },
      },
      vehiclePayments: {
        orderBy: { date: "desc" },
        take: 8,
        include: { consignment: { select: { lrNumber: true } } },
      },
    },
  })

  if (!owner) notFound()

  const totalAdvance = owner.vehiclePayments
    .filter((p) => p.type === "ADVANCE")
    .reduce((s, p) => s + p.amount, 0)
  const totalBalance = owner.vehiclePayments
    .filter((p) => p.type === "BALANCE")
    .reduce((s, p) => s + p.amount, 0)
  const totalPaid = totalAdvance + totalBalance

  return (
    <div className="space-y-5">
      <PageHeader
        title={owner.name}
        subtitle="Vehicle owner detail"
        backHref="/parties/vehicle-owners"
        backLabel="Back to Vehicle Owners"
        actions={
          <div className="flex items-center gap-2">
            <ToggleActiveButton id={owner.id} isActive={owner.isActive} type="VEHICLE_OWNER" />
            <Link href={`/parties/vehicle-owners/${owner.id}/edit`} className="btn-outline text-[13px]"
                  style={{ padding: "7px 14px" }}>
              <Pencil size={14} strokeWidth={2} />
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Owner info */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(13,43,26,0.07)" }}>
              <KeyRound size={22} strokeWidth={1.6} className="text-brand-900" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-brand-900">{owner.name}</h2>
              <Badge variant={owner.isActive ? "success" : "inactive"}
                     label={owner.isActive ? "Active" : "Inactive"} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {owner.phone && <InfoRow icon={Phone} label="Phone" value={owner.phone} />}
            {owner.altPhone && <InfoRow icon={Phone} label="Alt Phone" value={owner.altPhone} />}
            {owner.email && <InfoRow icon={Mail} label="Email" value={owner.email} />}
            {(owner.city || owner.state) && (
              <InfoRow icon={MapPin} label="Location"
                       value={[owner.city, owner.state].filter(Boolean).join(", ")} />
            )}
            {owner.pan && <InfoRow icon={CreditCard} label="PAN" value={owner.pan} mono />}
          </div>
        </GlassCard>

        {/* Payment summary */}
        <div className="space-y-3">
          {[
            { label: "Total Advance Paid", value: formatCurrency(totalAdvance) },
            { label: "Total Balance Paid", value: formatCurrency(totalBalance) },
            { label: "Total Paid", value: formatCurrency(totalPaid) },
            { label: "Vehicles", value: String(owner.vehicles.length) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
                 style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">{s.label}</p>
              <p className="text-[20px] font-bold text-brand-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicles */}
      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Vehicles</h3>
          <Link href={`/vehicles/new?ownerId=${owner.id}`}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900">
            <Plus size={13} strokeWidth={2.5} /> Add Vehicle
          </Link>
        </div>
        {owner.vehicles.length === 0 ? (
          <EmptyState icon={Truck} title="No vehicles added"
                      subtitle="Add vehicles owned by this person." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr><th>Vehicle No.</th><th>Type</th><th>Capacity</th><th>Trips</th><th>Status</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {owner.vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/vehicles/${v.id}`}
                            className="font-semibold text-brand-700 hover:underline font-mono">
                        {v.vehicleNumber}
                      </Link>
                    </td>
                    <td className="capitalize">{v.type.replace(/_/g, " ").toLowerCase()}</td>
                    <td>{v.capacity ? `${v.capacity} T` : "—"}</td>
                    <td><span className="font-semibold text-brand-700">{v._count.consignments}</span></td>
                    <td>
                      <Badge variant={v.status.toLowerCase() as any} />
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <Link href={`/vehicles/${v.id}`}
                              className="text-[12px] font-medium text-brand-700 hover:text-brand-900 px-2.5 py-1.5 rounded-lg hover:bg-brand-900/5">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Payment History */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Payment History</h3>
        </div>
        {owner.vehiclePayments.length === 0 ? (
          <EmptyState icon={Wrench} title="No payments recorded"
                      subtitle="Payments made to this owner will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr><th>Date</th><th>GR No.</th><th>Type</th><th>Amount</th><th>Mode</th><th>Reference</th></tr>
              </thead>
              <tbody>
                {owner.vehiclePayments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td className="font-mono text-[12.5px] text-brand-700">
                      {p.consignment?.lrNumber ?? "—"}
                    </td>
                    <td>
                      <Badge variant={p.type === "ADVANCE" ? "info" : p.type === "BALANCE" ? "success" : "neutral"}
                             label={p.type} />
                    </td>
                    <td className="font-semibold text-brand-700">{formatCurrency(p.amount)}</td>
                    <td>{p.mode}</td>
                    <td className="font-mono text-[12.5px] text-brand-900/50">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string; value: string; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} strokeWidth={1.8} className="text-brand-900/35 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/35">{label}</p>
        <p className={`text-[13.5px] text-brand-900 mt-0.5 ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
      </div>
    </div>
  )
}
