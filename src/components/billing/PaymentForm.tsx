"use client"

import { useState, useTransition } from "react"
import { recordPayment, type RecordPaymentInput } from "@/actions/billing"
import toast from "react-hot-toast"
import { Loader2, IndianRupee } from "lucide-react"

const PAYMENT_MODES = ["Bank Transfer", "NEFT", "RTGS", "Cheque", "Cash", "UPI", "Other"]

export default function PaymentForm({
  billId,
  partyId,
  balanceDue,
}: {
  billId:     string
  partyId:    string
  balanceDue: number
}) {
  const [isPending, start] = useTransition()
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    date:      today,
    amount:    String(+(balanceDue).toFixed(2)),
    tdsAmount: "0",
    mode:      "Bank Transfer",
    reference: "",
    notes:     "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  const amount    = Number(form.amount) || 0
  const tdsAmount = Number(form.tdsAmount) || 0
  const net       = +(amount - tdsAmount).toFixed(2)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (amount <= 0) { toast.error("Enter a valid payment amount"); return }
    if (amount > balanceDue + 0.01) { toast.error("Payment exceeds balance due"); return }

    const data: RecordPaymentInput = {
      billId, partyId,
      date:      form.date,
      amount,
      tdsAmount,
      mode:      form.mode,
      reference: form.reference || null,
      notes:     form.notes || null,
    }

    start(async () => {
      const r = await recordPayment(data)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Payment recorded!")
      setForm({ date: today, amount: "", tdsAmount: "0", mode: "Bank Transfer", reference: "", notes: "" })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Date *
          </label>
          <input type="date" className="input-field" value={form.date}
                 onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Amount (₹) * <span className="text-brand-900/35 normal-case font-normal">Balance: {formatNum(balanceDue)}</span>
          </label>
          <input type="number" className="input-field font-semibold" placeholder="0"
                 min={0} max={balanceDue} step="0.01" value={form.amount}
                 onChange={(e) => set("amount", e.target.value)} required />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            TDS Deducted (₹)
          </label>
          <input type="number" className="input-field" placeholder="0"
                 min={0} step="0.01" value={form.tdsAmount}
                 onChange={(e) => set("tdsAmount", e.target.value)} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Payment Mode *
          </label>
          <select className="input-field bg-white" value={form.mode}
                  onChange={(e) => set("mode", e.target.value)}>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Reference / Cheque No.
          </label>
          <input type="text" className="input-field font-mono" placeholder="UTR / cheque number"
                 value={form.reference} onChange={(e) => set("reference", e.target.value)} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Notes
          </label>
          <input type="text" className="input-field" placeholder="Optional note"
                 value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      {tdsAmount > 0 && (
        <div className="flex justify-between items-center p-3 rounded-xl text-[13px]"
             style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.08)" }}>
          <span className="text-brand-900/50">Net received (after TDS)</span>
          <span className="font-bold text-brand-900">₹{net.toLocaleString("en-IN")}</span>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary text-[13px]"
                style={{ padding: "9px 20px" }} disabled={isPending}>
          {isPending
            ? <><Loader2 size={14} className="animate-spin" /> Recording...</>
            : <><IndianRupee size={14} /> Record Payment</>}
        </button>
      </div>
    </form>
  )
}

function formatNum(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}
