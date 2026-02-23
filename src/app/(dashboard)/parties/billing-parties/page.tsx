import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { Landmark, Plus, Eye, Phone } from "lucide-react"

const PAGE_SIZE = 30

async function BillingPartiesList({ q, page }: { q: string; page: number }) {
  const where = {
    type: "BILLING_PARTY" as const,
    deletedAt: null,
    ...(q ? {
      OR: [
        { name:  { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { gstin: { contains: q, mode: "insensitive" as const } },
        { city:  { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { bills: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.party.count({ where }),
  ])

  if (parties.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="No billing parties yet"
        subtitle={q ? `No results for "${q}"` : "Add your first billing party to get started."}
        action={q ? undefined : { label: "Add Billing Party", href: "/parties/billing-parties/new" }}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="tms-table">
        <thead>
          <tr>
            <th>Party</th>
            <th>Phone</th>
            <th>GSTIN</th>
            <th>Bills</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((p) => (
            <tr key={p.id}>
              <td>
                <div>
                  <p className="font-semibold text-brand-900">{p.name}</p>
                  {(p.city || p.state) && (
                    <p className="text-[12px] text-brand-900/45 mt-0.5">
                      {[p.city, p.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-1.5">
                  <Phone size={12} className="text-brand-900/35" />
                  <span>{p.phone ?? "—"}</span>
                </div>
              </td>
              <td>
                <span className="font-mono text-[12.5px]">{p.gstin ?? "—"}</span>
              </td>
              <td>
                <span className="font-semibold text-brand-700">
                  {p._count.bills}
                </span>
              </td>
              <td>
                <Badge variant={p.isActive ? "success" : "inactive"}
                       label={p.isActive ? "Active" : "Inactive"} />
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/parties/billing-parties/${p.id}`}
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

export default async function BillingPartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  return (
    <div>
      <PageHeader
        title="Billing Parties"
        subtitle="Companies and groups you send invoices to"
        actions={
          <Link href="/parties/billing-parties/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Billing Party
          </Link>
        }
      />

      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-3 flex-wrap">
          <Suspense>
            <SearchBar placeholder="Search parties, GSTIN, city..." />
          </Suspense>
        </div>
        <Suspense fallback={
          <div className="py-16 text-center text-brand-900/30 text-[13px]">Loading...</div>
        }>
          <BillingPartiesList q={q} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
