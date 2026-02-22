"use client"

import { useState, useTransition } from "react"
import { recordVehiclePayment, type RecordVehiclePaymentInput } from "@/actions/billing"
import toast from "react-hot-toast"
import { Loader2, Save } from "lucide-react"

interface VehicleOwner { id: string; name: string }
interface Consignment {
  id: string; lrNumber: string; fromCity: string; toCity: string
  vehicleFreight: number | null; advancePaid: number; balancePaid: number
}

const PAYMENT_MODES = ["Bank Transfer", "NEFT", "RTGS", "Cheque", "Cash", "UPI", "Other"]
const PAYMENT_TYPES = [
  { value: "ADVANCE", label: "Advance" },
  { value: "BALANCE", label: "Balance" },
  { value: "EXTRA",   label: "Extra / Other" },
]

export default function VehiclePaymentFormWrapper({
  vehicleOwners,
  consignments,
}: {
  vehicleOwners: VehicleOwner[]
  consignments:  Consignment[]
}) {
  const [isPending, start] = useTransition()
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    partyId:       "",
    consignmentId: "",
    date:          today,
    amount:        "",
    type:          "ADVANCE",
    mode:          "Bank Transfer",
    reference:     "",
    notes:         "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  // Show balance due info when consignment selected
  const selectedConsignment = consignments.find((c) => c.id === form.consignmentId)
  const vehicleFreight = selectedConsignment?.vehicleFreight ?? 0
  const advancePaid    = selectedConsignment?.advancePaid ?? 0
  const balancePaid    = selectedConsignment?.balancePaid ?? 0
  const balanceDue     = vehicleFreight - advancePaid - balancePaid

  function handleConsignmentChange(cId: string) {
    set("consignmentId", cId)
    const c = consignments.find((x) => x.id === cId)
    if (c) {
      const due = c.vehicleFreight
        ? +(c.vehicleFreight - c.advancePaid - c.balancePaid).toFixed(2)
        : 0
      // Auto-fill amount with balance due if type is BALANCE
      if (form.type === "BALANCE" && due > 0) set("amount", String(due))
    }
  }

  function handleTypeChange(t: string) {
    set("type", t)
    if (t === "BALANCE" && selectedConsignment?.vehicleFreight) {
      const due = +(selectedConsignment.vehicleFreight - advancePaid - balancePaid).toFixed(2)
      if (due > 0) set("amount", String(due))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partyId) { toast.error("Select vehicle owner"); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter payment amount"); return }

    const data: RecordVehiclePaymentInput = {
      partyId:       form.partyId,
      consignmentId: form.consignmentId || null,
      date:          form.date,
      amount:        Number(form.amount),
      type:          form.type,
      mode:          form.mode,
      reference:     form.reference || null,
      notes:         form.notes || null,
    }

    start(async () => {
      const r = await recordVehiclePayment(data)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Vehicle payment recorded!")
      setForm({ partyId: "", consignmentId: "", date: today, amount: "", type: "ADVANCE", mode: "Bank Transfer", reference: "", notes: "" })
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Vehicle Owner *
          </label>
          <select className="input-field bg-white" value={form.partyId}
                  onChange={(e) => set("partyId", e.target.value)} required>
            <option value="">Select owner...</option>
            {vehicleOwners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Link Consignment
          </label>
          <select className="input-field bg-white" value={form.consignmentId}
                  onChange={(e) => handleConsignmentChange(e.target.value)}>
            <option value="">No specific consignment</option>
            {consignments.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lrNumber} — {c.fromCity}→{c.toCity}
                {c.vehicleFreight ? ` (₹${c.vehicleFreight.toLocaleString("en-IN")})` : ""}
              </option>
            ))}
          </select>
          {selectedConsignment?.vehicleFreight && (
            <p className="text-[11.5px] text-brand-900/45 mt-1">
              Freight: ₹{vehicleFreight.toLocaleString("en-IN")} ·
              Advance: ₹{advancePaid.toLocaleString("en-IN")} ·
              Balance due: <span className={`font-semibold ${balanceDue > 0 ? "text-amber-600" : "text-green-600"}`}>
                ₹{balanceDue.toLocaleString("en-IN")}
              </span>
            </p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Payment Type *
          </label>
          <select className="input-field bg-white" value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}>
            {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Date *
          </label>
          <input type="date" className="input-field" value={form.date}
                 onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Amount (₹) *
          </label>
          <input type="number" className="input-field font-semibold" placeholder="0"
                 min={0} step="0.01" value={form.amount}
                 onChange={(e) => set("amount", e.target.value)} required />
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
            Reference
          </label>
          <input type="text" className="input-field font-mono" placeholder="UTR / cheque no."
                 value={form.reference} onChange={(e) => set("reference", e.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Notes
          </label>
          <input type="text" className="input-field" placeholder="Optional note"
                 value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button type="submit" className="btn-primary text-[13px]"
                style={{ padding: "9px 20px" }} disabled={isPending}>
          {isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
            : <><Save size={14} /> Record Payment</>}
        </button>
      </div>
    </form>
  )
}
