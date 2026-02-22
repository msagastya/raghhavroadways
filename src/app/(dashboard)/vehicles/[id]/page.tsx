import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import VehicleDocumentForm from "@/components/vehicles/VehicleDocumentForm"
import VehicleIncidentForm from "@/components/vehicles/VehicleIncidentForm"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  Truck, User, Phone, MapPin, Pencil, PackageSearch, ArrowRight,
} from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  TRUCK: "Truck", TRAILER: "Trailer", TEMPO: "Tempo", CONTAINER: "Container",
  TANKER: "Tanker", OPEN_BODY: "Open Body", FLATBED: "Flatbed", OTHER: "Other",
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, phone: true, city: true, state: true } },
      documents: { orderBy: { createdAt: "desc" } },
      incidents: { orderBy: { date: "desc" } },
      consignments: {
        orderBy: { bookingDate: "desc" },
        take: 8,
        include: {
          consignor: { select: { name: true } },
          consignee: { select: { name: true } },
        },
      },
    },
  })

  if (!vehicle) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        title={vehicle.vehicleNumber}
        subtitle={`${TYPE_LABELS[vehicle.type] ?? vehicle.type}${vehicle.capacity ? ` · ${vehicle.capacity}T` : ""}`}
        backHref="/vehicles"
        backLabel="Back to Vehicles"
        actions={
          <Link href={`/vehicles/${vehicle.id}/edit`} className="btn-outline text-[13px]"
                style={{ padding: "7px 14px" }}>
            <Pencil size={14} /> Edit
          </Link>
        }
      />

      {/* Info row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vehicle card */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(13,43,26,0.07)" }}>
              <Truck size={22} strokeWidth={1.6} className="text-brand-900" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold font-mono text-brand-900">{vehicle.vehicleNumber}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant={vehicle.status.toLowerCase() as any} />
                <span className="text-[12px] text-brand-900/45">
                  {TYPE_LABELS[vehicle.type] ?? vehicle.type}
                  {vehicle.capacity ? ` · ${vehicle.capacity} Tons` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={User} label="Owner">
              <Link href={`/parties/vehicle-owners/${vehicle.owner.id}`}
                    className="font-semibold text-brand-700 hover:underline">
                {vehicle.owner.name}
              </Link>
            </InfoRow>
            {vehicle.owner.phone && (
              <InfoRow icon={Phone} label="Owner Phone">
                <span>{vehicle.owner.phone}</span>
              </InfoRow>
            )}
            {(vehicle.owner.city || vehicle.owner.state) && (
              <InfoRow icon={MapPin} label="Owner Location">
                <span>{[vehicle.owner.city, vehicle.owner.state].filter(Boolean).join(", ")}</span>
              </InfoRow>
            )}
          </div>

          {vehicle.notes && (
            <div className="mt-4 p-3 rounded-xl text-[13px] text-brand-900/60"
                 style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.07)" }}>
              {vehicle.notes}
            </div>
          )}
        </GlassCard>

        {/* Stats */}
        <div className="space-y-3">
          {[
            { label: "Total Trips",    value: String(vehicle.consignments.length) },
            { label: "Documents",      value: String(vehicle.documents.length) },
            { label: "Open Incidents", value: String(vehicle.incidents.filter(i => i.status === "OPEN").length) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
                 style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">{s.label}</p>
              <p className="text-[22px] font-bold text-brand-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Documents</h3>
          <p className="text-[12px] text-brand-900/45 mt-0.5">RC, Insurance, Fitness, Permit, PUC</p>
        </div>
        <VehicleDocumentForm vehicleId={vehicle.id} documents={vehicle.documents} />
      </GlassCard>

      {/* Incidents */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Incidents & Repairs</h3>
          <p className="text-[12px] text-brand-900/45 mt-0.5">Damage events and resolution log</p>
        </div>
        <VehicleIncidentForm vehicleId={vehicle.id} incidents={vehicle.incidents} />
      </GlassCard>

      {/* Trip history */}
      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Trip History</h3>
          <Link href={`/consignments?vehicle=${vehicle.id}`}
                className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {vehicle.consignments.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No trips yet"
                      subtitle="Consignments assigned to this vehicle appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr><th>GR No.</th><th>From</th><th>To</th><th>Freight</th><th>V.Freight</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {vehicle.consignments.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/consignments/${c.id}`}
                            className="font-semibold font-mono text-brand-700 hover:underline">
                        {c.lrNumber}
                      </Link>
                    </td>
                    <td>{c.fromCity}</td>
                    <td>{c.toCity}</td>
                    <td className="font-semibold">{formatCurrency(c.freightAmount)}</td>
                    <td>{c.vehicleFreight ? formatCurrency(c.vehicleFreight) : "—"}</td>
                    <td><Badge variant={c.status.toLowerCase() as any} /></td>
                    <td className="text-brand-900/50">{formatDate(c.bookingDate)}</td>
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

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} strokeWidth={1.8} className="text-brand-900/35 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/35">{label}</p>
        <div className="text-[13.5px] text-brand-900 mt-0.5 font-medium">{children}</div>
      </div>
    </div>
  )
}
