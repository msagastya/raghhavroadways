import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import SearchBar from "@/components/ui/SearchBar"
import Pagination from "@/components/ui/Pagination"
import { UserCheck, Plus, Eye, Phone, Percent, IndianRupee, ChevronRight } from "lucide-react"

const PAGE_SIZE = 30

async function AgentsList({ q, page }: { q: string; page: number }) {
  const where = {
    type: "AGENT" as const,
    deletedAt: null,
    ...(q ? {
      OR: [
        { name:  { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { city:  { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [agents, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { consignmentsAgent: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.party.count({ where }),
  ])

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No agents yet"
        subtitle={q ? `No results for "${q}"` : "Add agents who bring you business."}
        action={q ? undefined : { label: "Add Agent", href: "/parties/agents/new" }}
      />
    )
  }

  return (
    <div>
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-brand-900/5">
        {agents.map((a) => (
          <Link href={`/parties/agents/${a.id}`} key={a.id}
                className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-brand-900/3 active:bg-brand-900/5 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-[14px] text-brand-900 truncate">{a.name}</span>
                <Badge variant={a.isActive ? "success" : "inactive"} label={a.isActive ? "Active" : "Inactive"} />
              </div>
              <div className="flex items-center gap-3">
                {a.phone && (
                  <span className="flex items-center gap-1 text-[12px] text-brand-900/55">
                    <Phone size={11} className="text-brand-900/35" />{a.phone}
                  </span>
                )}
                {(a.city || a.state) && (
                  <span className="text-[12px] text-brand-900/45">
                    {[a.city, a.state].filter(Boolean).join(", ")}
                  </span>
                )}
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
              <th>Agent</th>
              <th>Phone</th>
              <th>Commission</th>
              <th>Consignments</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>
                  <div>
                    <p className="font-semibold text-brand-900">{a.name}</p>
                    {(a.city || a.state) && (
                      <p className="text-[12px] text-brand-900/45 mt-0.5">
                        {[a.city, a.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-brand-900/35" />
                    {a.phone ?? "—"}
                  </div>
                </td>
                <td>
                  {a.commissionType && a.commissionValue ? (
                    <div className="flex items-center gap-1 text-[13px] font-semibold text-brand-700">
                      {a.commissionType === "PERCENTAGE" ? (
                        <Percent size={12} strokeWidth={2.5} />
                      ) : (
                        <IndianRupee size={12} strokeWidth={2.5} />
                      )}
                      {a.commissionValue}
                      {a.commissionType === "PERCENTAGE" ? "%" : " fixed"}
                    </div>
                  ) : (
                    <span className="text-brand-900/35">Varies</span>
                  )}
                </td>
                <td>
                  <span className="font-semibold text-brand-700">
                    {a._count.consignmentsAgent}
                  </span>
                </td>
                <td>
                  <Badge variant={a.isActive ? "success" : "inactive"}
                         label={a.isActive ? "Active" : "Inactive"} />
                </td>
                <td>
                  <div className="flex justify-end">
                    <Link
                      href={`/parties/agents/${a.id}`}
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

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: pageStr = "1" } = await searchParams
  const page = Math.max(1, parseInt(pageStr) || 1)

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Agents who bring consignments to you"
        actions={
          <Link href="/parties/agents/new" className="btn-primary text-[13px]"
                style={{ padding: "8px 16px" }}>
            <Plus size={16} strokeWidth={2.5} />
            Add Agent
          </Link>
        }
      />
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6">
          <Suspense>
            <SearchBar placeholder="Search agents, city..." />
          </Suspense>
        </div>
        <Suspense fallback={
          <div className="py-16 text-center text-brand-900/30 text-[13px]">Loading...</div>
        }>
          <AgentsList q={q} page={page} />
        </Suspense>
      </GlassCard>
    </div>
  )
}
