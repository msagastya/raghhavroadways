import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Phone, Mail, MapPin, UserCheck, FileText, CreditCard, Percent, IndianRupee, PackageSearch, Pencil, ArrowRight } from "lucide-react"
import ToggleActiveButton from "@/components/parties/ToggleActiveButton"

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const agent = await prisma.party.findUnique({
    where: { id, type: "AGENT" },
    include: {
      consignmentsAgent: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          consignor: { select: { name: true } },
          consignee: { select: { name: true } },
        },
      },
    },
  })

  if (!agent) notFound()

  const totalFreight = agent.consignmentsAgent.reduce((s, c) => s + c.freightAmount, 0)
  const commissionEstimate =
    agent.commissionType === "PERCENTAGE" && agent.commissionValue
      ? (totalFreight * agent.commissionValue) / 100
      : agent.commissionType === "FIXED" && agent.commissionValue
      ? agent.consignmentsAgent.length * agent.commissionValue
      : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={agent.name}
        subtitle="Agent detail"
        backHref="/parties/agents"
        backLabel="Back to Agents"
        actions={
          <div className="flex items-center gap-2">
            <ToggleActiveButton id={agent.id} isActive={agent.isActive} type="AGENT" />
            <Link href={`/parties/agents/${agent.id}/edit`} className="btn-outline text-[13px]"
                  style={{ padding: "7px 14px" }}>
              <Pencil size={14} strokeWidth={2} />
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(13,43,26,0.07)" }}>
              <UserCheck size={22} strokeWidth={1.6} className="text-brand-900" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-brand-900">{agent.name}</h2>
              <Badge variant={agent.isActive ? "success" : "inactive"}
                     label={agent.isActive ? "Active" : "Inactive"} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agent.phone && <InfoRow icon={Phone} label="Phone" value={agent.phone} />}
            {agent.altPhone && <InfoRow icon={Phone} label="Alt Phone" value={agent.altPhone} />}
            {agent.email && <InfoRow icon={Mail} label="Email" value={agent.email} />}
            {(agent.city || agent.state) && (
              <InfoRow icon={MapPin} label="Location"
                       value={[agent.city, agent.state].filter(Boolean).join(", ")} />
            )}
            {agent.gstin && <InfoRow icon={FileText} label="GSTIN" value={agent.gstin} mono />}
            {agent.pan && <InfoRow icon={CreditCard} label="PAN" value={agent.pan} mono />}
            {agent.commissionType && (
              <InfoRow
                icon={agent.commissionType === "PERCENTAGE" ? Percent : IndianRupee}
                label="Commission"
                value={
                  agent.commissionType === "PERCENTAGE"
                    ? `${agent.commissionValue}% of freight`
                    : `₹${agent.commissionValue} per consignment`
                }
              />
            )}
          </div>
        </GlassCard>

        <div className="space-y-3">
          {[
            { label: "Total Consignments", value: String(agent.consignmentsAgent.length), color: "brand" as const },
            { label: "Total Freight Value", value: formatCurrency(totalFreight), color: "brand" as const },
            ...(commissionEstimate !== null
              ? [{ label: "Commission Estimate", value: formatCurrency(commissionEstimate), color: "green" as const }]
              : []),
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4"
                 style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">{s.label}</p>
              <p className="text-[20px] font-bold text-brand-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Consignments via this Agent</h3>
          <Link href={`/consignments?agent=${agent.id}`}
                className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {agent.consignmentsAgent.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No consignments via this agent yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr><th>GR No.</th><th>From</th><th>To</th><th>Freight</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {agent.consignmentsAgent.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/consignments/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.lrNumber}
                      </Link>
                    </td>
                    <td>{c.fromCity}</td>
                    <td>{c.toCity}</td>
                    <td className="font-semibold">{formatCurrency(c.freightAmount)}</td>
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
