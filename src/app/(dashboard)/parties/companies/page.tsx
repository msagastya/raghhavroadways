import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { Building2, Plus, Eye, Phone, ChevronRight } from "lucide-react"

const PAGE_SIZE = 30

async function CompaniesList({ q, page }: { q: string; page: number }) {
  const where = {
    type: "COMPANY" as const,
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

  const [companies, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { consignmentsOrigin: true, bills: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.party.count({ where }),
  ])

  if (companies.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies yet"
        subtitle={q ? `No results for "${q}"` : "Add your first client company to get started."}
        action={q ? undefined : { label: "Add Company", href: "/parties/companies/new" }}
      />
    )
  }

  return (
    <div>
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-brand-900/5">
        {companies.map((c) => (
          <Link href={`/parties/companies/${c.id}`} key={c.id}
                className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-brand-900/3 active:bg-brand-900/5 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-[14px] text-brand-900 truncate">{c.name}</span>
                <Badge variant={c.isActive ? "success" : "inactive"} label={c.isActive ? "Active" : "Inactive"} />
              </div>
              <div className="flex items-center gap-3">
                {c.phone && (
                  <span className="flex items-center gap-1 text-[12px] text-brand-900/55">
                    <Phone size={11} className="text-brand-900/35" />{c.phone}
                  </span>
                )}
                {(c.city || c.state) && (
                  <span className="text-[12px] text-brand-900/45">
                    {[c.city, c.state].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              {c.gstin && (
                <p className="font-mono text-[11.5px] text-brand-900/40 mt-0.5">{c.gstin}</p>
              )}
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
              <th>Company</th>
              <th>Phone</th>
              <th>GSTIN</th>
              <th>Consignments</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>
                  <div>
                    <p className="font-semibold text-brand-900">{c.name}</p>
                    {(c.city || c.state) && (
                      <p className="text-[12px] text-brand-900/45 mt-0.5">
                        {[c.city, c.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-brand-900/35" />
                    <span>{c.phone ?? "—"}</span>
                  </div>
                </td>
                <td>
                  <span className="font-mono text-[12.5px]">{c.gstin ?? "—"}</span>
                </td>
                <td>
                  <span className="font-semibold text-brand-700">
                    {c._count.consignmentsOrigin}
                  </span>
                </td>
                <td>
                  <Badge variant={c.isActive ? "success" : "inactive"}
                         label={c.isActive ? "Active" : "Inactive"} />
                </td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/parties/companies/${c.id}`}
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
      </div>

      <Suspense>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  )
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Client companies that give you consignments"
        actions={
          <Link href="/parties/companies/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Company
          </Link>
        }
      />

      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6 flex items-center gap-3 flex-wrap">
          <Suspense>
            <SearchBar placeholder="Search companies, GSTIN, city..." />
          </Suspense>
        </div>
        <Suspense fallback={
          <div className="py-16 text-center text-brand-900/30 text-[13px]">Loading...</div>
        }>
          <CompaniesList q={q} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
