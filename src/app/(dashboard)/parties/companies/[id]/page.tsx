import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import EmptyState from "@/components/ui/EmptyState"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Phone, Mail, MapPin, Building2, CreditCard, FileText,
  PackageSearch, Receipt, ArrowRight, Pencil, IndianRupee, ChevronRight,
} from "lucide-react"
import ToggleActiveButton from "@/components/parties/ToggleActiveButton"

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const company = await prisma.party.findUnique({
    where: { id, type: "COMPANY" },
    include: {
      consignmentsOrigin: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { consignee: { select: { name: true } } },
      },
      bills: {
        orderBy: { billDate: "desc" },
        take: 6,
      },
      paymentsIn: {
        orderBy: { date: "desc" },
        take: 6,
      },
    },
  })

  if (!company) notFound()

  const totalBilled = company.bills.reduce((s, b) => s + b.totalAmount, 0)
  const totalPaid   = company.bills.reduce((s, b) => s + b.paidAmount, 0)
  const outstanding = totalBilled - totalPaid

  return (
    <div className="space-y-5">
      <PageHeader
        title={company.name}
        subtitle="Company detail"
        backHref="/parties/companies"
        backLabel="Back to Companies"
        actions={
          <div className="flex items-center gap-2">
            <ToggleActiveButton id={company.id} isActive={company.isActive} type="COMPANY" />
            <Link
              href={`/parties/companies/${company.id}/edit`}
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
              <Building2 size={22} strokeWidth={1.6} className="text-brand-900" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-brand-900">{company.name}</h2>
              <Badge variant={company.isActive ? "success" : "inactive"}
                     label={company.isActive ? "Active" : "Inactive"}
                     className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {company.phone && (
              <InfoRow icon={Phone} label="Primary Phone" value={company.phone} />
            )}
            {company.altPhone && (
              <InfoRow icon={Phone} label="Alternate Phone" value={company.altPhone} />
            )}
            {company.email && (
              <InfoRow icon={Mail} label="Email" value={company.email} />
            )}
            {(company.city || company.state) && (
              <InfoRow
                icon={MapPin}
                label="Location"
                value={[company.city, company.state].filter(Boolean).join(", ")}
              />
            )}
            {company.gstin && (
              <InfoRow icon={FileText} label="GSTIN" value={company.gstin} mono />
            )}
            {company.pan && (
              <InfoRow icon={CreditCard} label="PAN" value={company.pan} mono />
            )}
            {company.creditLimit && (
              <InfoRow
                icon={IndianRupee}
                label="Credit Limit"
                value={formatCurrency(company.creditLimit)}
              />
            )}
          </div>

          {company.notes && (
            <div className="mt-4 p-3 rounded-xl text-[13px] text-brand-900/60 leading-relaxed"
                 style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.07)" }}>
              {company.notes}
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
            label="Total Consignments"
            value={String(company.consignmentsOrigin.length)}
            color="brand"
          />
        </div>
      </div>

      {/* Recent Consignments */}
      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Consignments</h3>
          <Link href={`/consignments?party=${company.id}`}
                className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-900 transition-colors">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {company.consignmentsOrigin.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No consignments yet"
                      subtitle="Consignments booked for this company will appear here." />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-brand-900/5">
              {company.consignmentsOrigin.map((c) => (
                <Link href={`/consignments/${c.id}`} key={c.id}
                      className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-brand-900/3 active:bg-brand-900/5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold font-mono text-[13px] text-brand-700">{c.lrNumber}</span>
                      <Badge variant={c.status.toLowerCase() as any} />
                    </div>
                    <p className="text-[12px] text-brand-900/55">{c.fromCity} → {c.toCity}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[13px] font-bold text-brand-900">{formatCurrency(c.freightAmount)}</span>
                      <Badge variant={
                        c.paymentType === "PAID" ? "paid" :
                        c.paymentType === "TO_PAY" ? "info" : "neutral"
                      } label={c.paymentType === "TBB" ? "TBB" : c.paymentType === "TO_PAY" ? "To Pay" : "Paid"} />
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
                    <th>GR No.</th>
                    <th>Route</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {company.consignmentsOrigin.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/consignments/${c.id}`}
                              className="font-semibold text-brand-700 hover:underline">
                          {c.lrNumber}
                        </Link>
                      </td>
                      <td>
                        <span>{c.fromCity}</span>
                        <span className="text-brand-900/35 mx-1">→</span>
                        <span>{c.toCity}</span>
                      </td>
                      <td className="font-semibold">{formatCurrency(c.freightAmount)}</td>
                      <td>
                        <Badge variant={
                          c.paymentType === "PAID" ? "paid" :
                          c.paymentType === "TO_PAY" ? "info" : "neutral"
                        } label={c.paymentType === "TBB" ? "TBB" : c.paymentType === "TO_PAY" ? "To Pay" : "Paid"} />
                      </td>
                      <td><Badge variant={c.status.toLowerCase() as any} /></td>
                      <td className="text-brand-900/50">{formatDate(c.bookingDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </GlassCard>

      {/* Payment History */}
      <GlassCard padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900/6">
          <h3 className="text-[15px] font-bold text-brand-900">Payment History</h3>
        </div>
        {company.paymentsIn.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments recorded"
                      subtitle="Payments received from this company will appear here." />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-brand-900/5">
              {company.paymentsIn.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[12px] text-brand-900/50">{formatDate(p.date)}</span>
                      <span className="text-[14px] font-bold text-green-700">{formatCurrency(p.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-brand-900/70">{p.mode}</span>
                      {p.reference && (
                        <span className="font-mono text-[11.5px] text-brand-900/45">{p.reference}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                  {company.paymentsIn.map((p) => (
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
          </>
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
      <p className={`text-[20px] font-bold mt-1`} style={{ color: styles.text }}>{value}</p>
    </div>
  )
}
