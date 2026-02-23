import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Phone, Mail, MapPin, Landmark, CreditCard, FileText,
  Receipt, Pencil, IndianRupee,
} from "lucide-react"
import ToggleActiveButton from "@/components/parties/ToggleActiveButton"

export default async function BillingPartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const party = await prisma.party.findUnique({
    where: { id, type: "BILLING_PARTY" },
    include: {
      bills: {
        orderBy: { billDate: "desc" },
        take: 8,
      },
      paymentsIn: {
        orderBy: { date: "desc" },
        take: 6,
      },
    },
  })

  if (!party) notFound()

  const totalBilled = party.bills.reduce((s, b) => s + b.totalAmount, 0)
  const totalPaid   = party.bills.reduce((s, b) => s + b.paidAmount, 0)
  const outstanding = totalBilled - totalPaid

  return (
    <div className="space-y-5">
      <PageHeader
        title={party.name}
        subtitle="Billing party detail"
        backHref="/parties/billing-parties"
        backLabel="Back to Billing Parties"
        actions={
          <div className="flex items-center gap-2">
            <ToggleActiveButton id={party.id} isActive={party.isActive} type="BILLING_PARTY" />
            <Link
              href={`/parties/billing-parties/${party.id}/edit`}
              className="btn-outline text-[13px]"
              style={{ padding: "7px 14px" }}
            >
              <Pencil size={14} strokeWidth={2} />
              Edit
            </Link>
          </div>
        }
      />

      {/* Top row — info + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Party info */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(13,43,26,0.07)" }}>
              <Landmark size={22} strokeWidth={1.6} className="text-brand-900" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-brand-900">{party.name}</h2>
              <Badge variant={party.isActive ? "success" : "inactive"}
                     label={party.isActive ? "Active" : "Inactive"}
                     className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {party.phone && (
              <InfoRow icon={Phone} label="Primary Phone" value={party.phone} />
            )}
            {party.altPhone && (
              <InfoRow icon={Phone} label="Alternate Phone" value={party.altPhone} />
            )}
            {party.email && (
              <InfoRow icon={Mail} label="Email" value={party.email} />
            )}
            {(party.city || party.state) && (
              <InfoRow
                icon={MapPin}
                label="Location"
                value={[party.city, party.state].filter(Boolean).join(", ")}
              />
            )}
            {party.gstin && (
              <InfoRow icon={FileText} label="GSTIN" value={party.gstin} mono />
            )}
            {party.pan && (
              <InfoRow icon={CreditCard} label="PAN" value={party.pan} mono />
            )}
            {party.creditLimit && (
              <InfoRow
                icon={IndianRupee}
                label="Credit Limit"
                value={formatCurrency(party.creditLimit)}
              />
            )}
          </div>

          {party.address && (
            <div className="mt-4 p-3 rounded-xl text-[13px] text-brand-900/60 leading-relaxed"
                 style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.07)" }}>
              {party.address}
            </div>
          )}

          {party.notes && (
            <div className="mt-3 p-3 rounded-xl text-[13px] text-brand-900/60 leading-relaxed"
                 style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.07)" }}>
              {party.notes}
            </div>
          )}
        </GlassCard>

        {/* Financial summary */}
        <div className="space-y-3">
          <FinanceStat label="Total Billed" value={formatCurrency(totalBilled)} color="brand" />
          <FinanceStat label="Total Received" value={formatCurrency(totalPaid)} color="green" />
          <FinanceStat
            label="Outstanding"
            value={formatCurrency(outstanding)}
            color={outstanding > 0 ? "red" : "green"}
            highlight={outstanding > 0}
          />
          <FinanceStat
            label="Total Invoices"
            value={String(party.bills.length)}
            color="brand"
          />
        </div>
      </div>

      {/* Bills */}
      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Invoices</h3>
          <Link href={`/billing?party=${party.id}`}
                className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900 transition-colors">
            View all →
          </Link>
        </div>
        {party.bills.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet"
                      subtitle="Bills generated for this party will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {party.bills.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/billing/${b.id}`}
                            className="font-semibold text-brand-700 hover:underline font-mono">
                        {b.billNumber}
                      </Link>
                    </td>
                    <td className="text-brand-900/50">{formatDate(b.billDate)}</td>
                    <td className="font-semibold">{formatCurrency(b.totalAmount)}</td>
                    <td className="text-green-700 font-semibold">{formatCurrency(b.paidAmount)}</td>
                    <td><Badge variant={b.status.toLowerCase() as any} /></td>
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
        {party.paymentsIn.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments recorded"
                      subtitle="Payments received from this party will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tms-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>TDS</th>
                </tr>
              </thead>
              <tbody>
                {party.paymentsIn.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td className="font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td><span className="font-medium">{p.mode}</span></td>
                    <td className="text-brand-900/55 font-mono text-[12.5px]">{p.reference ?? "—"}</td>
                    <td>{p.tdsAmount > 0 ? formatCurrency(p.tdsAmount) : "—"}</td>
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

function InfoRow({
  icon: Icon, label, value, mono,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} strokeWidth={1.8} className="text-brand-900/35 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/35">{label}</p>
        <p className={`text-[13.5px] text-brand-900 mt-0.5 ${mono ? "font-mono" : "font-medium"}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function FinanceStat({
  label, value, color, highlight,
}: {
  label: string; value: string; color: "brand" | "green" | "red"; highlight?: boolean
}) {
  const styles = {
    brand: { bg: "rgba(13,43,26,0.05)", text: "#0D2B1A", border: "rgba(13,43,26,0.08)" },
    green: { bg: "rgba(39,174,96,0.06)", text: "#1E7A46", border: "rgba(39,174,96,0.15)" },
    red:   { bg: "rgba(192,57,43,0.06)", text: "#C0392B", border: "rgba(192,57,43,0.15)" },
  }[color]

  return (
    <div className="rounded-xl p-4"
         style={{ background: styles.bg, border: `1px solid ${styles.border}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">{label}</p>
      <p className="text-[20px] font-bold mt-1" style={{ color: styles.text }}>{value}</p>
    </div>
  )
}
