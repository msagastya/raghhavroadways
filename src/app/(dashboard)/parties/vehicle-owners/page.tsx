import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { KeyRound, Plus, Eye, Phone, Truck } from "lucide-react"

const PAGE_SIZE = 30

async function VehicleOwnersList({ q, page }: { q: string; page: number }) {
  const where = {
    type: "VEHICLE_OWNER" as const,
    deletedAt: null,
    ...(q ? {
      OR: [
        { name:  { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { city:  { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [owners, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        vehicles: { where: { isActive: true, deletedAt: null }, select: { id: true, vehicleNumber: true, status: true } },
        _count: { select: { vehiclePayments: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.party.count({ where }),
  ])

  if (owners.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No vehicle owners yet"
        subtitle={q ? `No results for "${q}"` : "Add truck owners whose vehicles you use."}
        action={q ? undefined : { label: "Add Vehicle Owner", href: "/parties/vehicle-owners/new" }}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="tms-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Phone</th>
            <th>Vehicles</th>
            <th>Payments Made</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {owners.map((o) => (
            <tr key={o.id}>
              <td>
                <div>
                  <p className="font-semibold text-brand-900">{o.name}</p>
                  {(o.city || o.state) && (
                    <p className="text-[12px] text-brand-900/45 mt-0.5">
                      {[o.city, o.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1.5">
                  <Phone size={12} className="text-brand-900/35" />
                  {o.phone ?? "—"}
                </div>
              </td>
              <td>
                {o.vehicles.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Truck size={13} className="text-brand-700" />
                    <span className="font-semibold text-brand-700">{o.vehicles.length}</span>
                    <span className="text-brand-900/40 text-[12px]">vehicle{o.vehicles.length > 1 ? "s" : ""}</span>
                  </div>
                ) : (
                  <span className="text-brand-900/35">None added</span>
                )}
              </td>
              <td>
                <span className="font-semibold text-brand-700">
                  {o._count.vehiclePayments}
                </span>
              </td>
              <td>
                <Badge variant={o.isActive ? "success" : "inactive"}
                       label={o.isActive ? "Active" : "Inactive"} />
              </td>
              <td>
                <div className="flex justify-end">
                  <Link
                    href={`/parties/vehicle-owners/${o.id}`}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-brand-700 hover:text-brand-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-brand-900/5"
                  >
                    <Eye size={13} strokeWidth={2} />
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Suspense>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  )
}

export default async function VehicleOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  return (
    <div>
      <PageHeader
        title="Vehicle Owners"
        subtitle="Truck owners whose vehicles you use for consignments"
        actions={
          <Link href="/parties/vehicle-owners/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Vehicle Owner
          </Link>
        }
      />
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <Suspense>
            <SearchBar placeholder="Search owners, city..." />
          </Suspense>
        </div>
        <Suspense fallback={
          <div className="py-16 text-center text-brand-900/30 text-[13px]">Loading...</div>
        }>
          <VehicleOwnersList q={q} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
