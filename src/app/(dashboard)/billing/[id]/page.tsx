import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import PageHeader from "@/components/ui/PageHeader"
import GlassCard from "@/components/ui/GlassCard"
import Badge from "@/components/ui/Badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  FileText, Building2, IndianRupee, Truck, Pencil, Printer,
  CheckCircle2, Clock, Package,
} from "lucide-react"
import BillActions from "@/components/billing/BillActions"
import PaymentForm from "@/components/billing/PaymentForm"

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      party:       { select: { id: true, name: true, gstin: true, address: true, city: true, state: true, phone: true } },
      consignment: {
        select: {
          id: true, lrNumber: true, fromCity: true, fromState: true,
          toCity: true, toState: true, description: true, freightType: true,
          weight: true, quantity: true, unit: true,
        },
      },
      payments: { orderBy: { date: "asc" } },
    },
  })

  if (!bill) notFound()

  const balance    = +(bill.totalAmount - bill.paidAmount).toFixed(2)
  const isPaidFull = bill.status === "PAID"
  const canPay     = !isPaidFull && bill.status !== "CANCELLED" && bill.status !== "DRAFT"

  return (
    <div className="space-y-5">
      <PageHeader
        title={bill.billNumber}
        subtitle={`${bill.party.name} · ${formatDate(bill.billDate)}`}
        backHref="/billing"
        backLabel="Back to Billing"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={bill.status.toLowerCase() as any} className="px-3 py-1 text-[13px]" />
            <Link href={`/billing/${bill.id}/print`}
                  className="btn-outline text-[13px]" style={{ padding: "7px 14px" }}
                  target="_blank">
              <Printer size={14} /> Print
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Invoice summary */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Invoice Summary</span>
          </div>
          <div className="space-y-2.5">
            <Row label="Freight (Subtotal)" value={formatCurrency(bill.subtotal)} />
            {bill.isInterstate ? (
              <Row label={`IGST (${bill.gstRate}%)`} value={formatCurrency(bill.igst)} />
            ) : (
              <>
                <Row label={`CGST (${bill.gstRate / 2}%)`} value={formatCurrency(bill.cgst)} />
                <Row label={`SGST (${bill.gstRate / 2}%)`} value={formatCurrency(bill.sgst)} />
              </>
            )}
            <div className="h-px bg-brand-900/8" />
            <Row label="Total Amount" value={formatCurrency(bill.totalAmount)} bold />
            <Row label="Paid Amount"  value={formatCurrency(bill.paidAmount)}
                 valueClass="text-green-600" />
            <Row
              label="Balance Due"
              value={formatCurrency(balance)}
              bold
              valueClass={balance > 0 ? "text-amber-600" : "text-green-600"}
            />
          </div>
          {bill.dueDate && (
            <p className={`text-[12px] font-semibold mt-3 ${
              new Date(bill.dueDate) < new Date() && !isPaidFull ? "text-red-500" : "text-brand-900/40"
            }`}>
              Due: {formatDate(bill.dueDate)}
              {new Date(bill.dueDate) < new Date() && !isPaidFull && " · Overdue"}
            </p>
          )}
        </GlassCard>

        {/* Party details */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Billed To</span>
          </div>
          <Link href={`/parties/companies/${bill.party.id}`}
                className="text-[15px] font-bold text-brand-700 hover:underline block mb-2">
            {bill.party.name}
          </Link>
          {bill.party.gstin && (
            <p className="text-[12px] font-mono text-brand-900/55 mb-1">GSTIN: {bill.party.gstin}</p>
          )}
          {bill.party.phone && <p className="text-[12.5px] text-brand-900/45">{bill.party.phone}</p>}
          {bill.party.address && (
            <p className="text-[12.5px] text-brand-900/45 mt-1 leading-relaxed">
              {bill.party.address}{bill.party.city ? `, ${bill.party.city}` : ""}
              {bill.party.state ? `, ${bill.party.state}` : ""}
            </p>
          )}
        </GlassCard>

        {/* Consignment details */}
        {bill.consignment && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={15} strokeWidth={1.8} className="text-brand-900/50" />
              <span className="text-[13px] font-bold text-brand-900">Consignment</span>
            </div>
            <Link href={`/consignments/${bill.consignment.id}`}
                  className="font-bold text-brand-700 hover:underline text-[14px] font-mono block mb-2">
              {bill.consignment.lrNumber}
            </Link>
            <p className="text-[13px] text-brand-900 font-medium mb-1">
              {bill.consignment.fromCity}, {bill.consignment.fromState}
              {" → "}
              {bill.consignment.toCity}, {bill.consignment.toState}
            </p>
            <p className="text-[12.5px] text-brand-900/50">{bill.consignment.description}</p>
            {bill.consignment.weight && (
              <p className="text-[12px] text-brand-900/45 mt-1">
                {bill.consignment.weight.toLocaleString()} KG
                {bill.consignment.quantity ? ` · ${bill.consignment.quantity} ${bill.consignment.unit ?? ""}` : ""}
              </p>
            )}
          </GlassCard>
        )}

        {/* Bill status actions */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} strokeWidth={1.8} className="text-brand-900/50" />
            <span className="text-[13px] font-bold text-brand-900">Bill Status</span>
          </div>
          <BillActions billId={bill.id} currentStatus={bill.status} />
        </GlassCard>
      </div>

      {/* Payment history */}
      <GlassCard padding={false}>
        <div className="px-5 py-4 border-b border-brand-900/6 flex items-center justify-between">
          <span className="text-[13px] font-bold text-brand-900">Payment History</span>
          <span className="text-[12px] text-brand-900/40">{bill.payments.length} payment{bill.payments.length !== 1 ? "s" : ""}</span>
        </div>
        {bill.payments.length > 0 ? (
          <div className="divide-y divide-brand-900/6">
            {bill.payments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-brand-900">{formatCurrency(p.amount)}</p>
                  <p className="text-[12px] text-brand-900/40 mt-0.5">
                    {formatDate(p.date)} · {p.mode}
                    {p.reference ? ` · Ref: ${p.reference}` : ""}
                    {p.tdsAmount > 0 ? ` · TDS: ${formatCurrency(p.tdsAmount)}` : ""}
                  </p>
                  {p.notes && <p className="text-[11.5px] text-brand-900/35 mt-0.5 italic">{p.notes}</p>}
                </div>
                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[13px] text-brand-900/35">
            No payments recorded yet
          </div>
        )}
      </GlassCard>

      {/* Record payment */}
      {canPay && (
        <GlassCard>
          <p className="text-[13px] font-bold text-brand-900 mb-3">Record Payment</p>
          <PaymentForm
            billId={bill.id}
            partyId={bill.party.id}
            balanceDue={balance}
          />
        </GlassCard>
      )}

      {/* Notes */}
      {bill.notes && (
        <GlassCard>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40 mb-2">Notes</p>
          <p className="text-[13.5px] text-brand-900/70 leading-relaxed">{bill.notes}</p>
        </GlassCard>
      )}
    </div>
  )
}

function Row({ label, value, bold, valueClass }: {
  label: string; value: string; bold?: boolean; valueClass?: string
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-[12.5px] text-brand-900/45 shrink-0">{label}</span>
      <span className={`text-[13.5px] text-right ${bold ? "font-bold text-brand-900" : "font-medium text-brand-900"} ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  )
}
