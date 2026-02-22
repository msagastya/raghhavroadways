import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { Truck, Plus, Eye, AlertTriangle, FileWarning } from "lucide-react"

const PAGE_SIZE = 20

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  TRUCK: "Truck", TRAILER: "Trailer", TEMPO: "Tempo", CONTAINER: "Container",
  TANKER: "Tanker", OPEN_BODY: "Open Body", FLATBED: "Flatbed", OTHER: "Other",
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86400000)
}

async function VehiclesList({ q, page }: { q: string; page: number }) {
  const where = {
    isActive: true,
    deletedAt: null,
    ...(q ? {
      OR: [
        { vehicleNumber: { contains: q, mode: "insensitive" as const } },
        { type:          { contains: q, mode: "insensitive" as const } },
        { owner:         { name: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        documents: true,
        _count: { select: { consignments: true } },
      },
      orderBy: { vehicleNumber: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.vehicle.count({ where }),
  ])

  if (vehicles.length === 0) {
    return (
      <EmptyState icon={Truck} title="No vehicles added"
                  subtitle={q ? `No results for "${q}"` : "Add vehicles to assign them to consignments."}
                  action={q ? undefined : { label: "Add Vehicle", href: "/vehicles/new" }} />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="tms-table">
        <thead>
          <tr><th>Vehicle No.</th><th>Type</th><th>Owner</th><th>Capacity</th><th>Trips</th><th>Docs</th><th>Status</th><th className="text-right">Actions</th></tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const expiringDocs = v.documents.filter((d) => {
              if (!d.expiryDate) return false
              const days = daysUntil(d.expiryDate)
              return days >= 0 && days <= 30
            })
            const expiredDocs = v.documents.filter((d) => d.expiryDate && daysUntil(d.expiryDate) < 0)

            return (
              <tr key={v.id}>
                <td>
                  <Link href={`/vehicles/${v.id}`}
                        className="font-semibold font-mono text-brand-700 hover:underline">
                    {v.vehicleNumber}
                  </Link>
                </td>
                <td>{VEHICLE_TYPE_LABELS[v.type] ?? v.type}</td>
                <td>
                  <Link href={`/parties/vehicle-owners/${v.owner.id}`}
                        className="text-brand-700 hover:underline text-[13px]">
                    {v.owner.name}
                  </Link>
                </td>
                <td>{v.capacity ? `${v.capacity} T` : "—"}</td>
                <td><span className="font-semibold text-brand-700">{v._count.consignments}</span></td>
                <td>
                  <div className="flex items-center gap-1.5">
                    {expiredDocs.length > 0 && (
                      <span className="flex items-center gap-1 text-[11.5px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        <AlertTriangle size={11} /> {expiredDocs.length} expired
                      </span>
                    )}
                    {expiringDocs.length > 0 && (
                      <span className="flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <FileWarning size={11} /> {expiringDocs.length} expiring
                      </span>
                    )}
                    {expiredDocs.length === 0 && expiringDocs.length === 0 && (
                      <span className="text-brand-900/30 text-[12px]">
                        {v.documents.length > 0 ? "OK" : "—"}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <Badge variant={v.status.toLowerCase() as any} />
                </td>
                <td>
                  <div className="flex justify-end">
                    <Link href={`/vehicles/${v.id}`}
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
      <Suspense>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  )
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)
  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="All trucks and their owners, documents, and status"
        actions={
          <Link href="/vehicles/new" className="btn-primary text-[13px]" style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} /> Add Vehicle
          </Link>
        }
      />
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <Suspense><SearchBar placeholder="Search by vehicle number, owner..." /></Suspense>
        </div>
        <Suspense fallback={<div className="py-16 text-center text-[13px] text-brand-900/30">Loading...</div>}>
          <VehiclesList q={q} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
