"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createBill, type CreateBillInput } from "@/actions/billing"
import toast from "react-hot-toast"
import { Loader2, Save, IndianRupee } from "lucide-react"
import { parseDescriptions } from "@/lib/parseDescriptions"

interface Company {
  id: string; name: string; gstin: string | null; state: string | null; creditDays: number | null
}
interface UnbilledConsignment {
  id: string; lrNumber: string; fromCity: string; toCity: string
  freightAmount: number; description: string; consignor: { name: string }
}
interface PreselectedConsignment {
  id: string; lrNumber: string; freightAmount: number; description: string
  consignor: { id: string; name: string; gstin: string | null; state: string | null }
  consignee: { id: string; name: string; state: string | null }
}

interface Props {
  companies:                Company[]
  unbilledConsignments:     UnbilledConsignment[]
  preselectedConsignment?:  PreselectedConsignment | null
  companyState?:            string
}

const GST_RATES = [5, 12, 18]

function S({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">{children}</span>
      <div className="flex-1 h-px bg-brand-900/8" />
    </div>
  )
}

function F({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function BillForm({ companies, unbilledConsignments, preselectedConsignment, companyState = "Maharashtra" }: Props) {
  const router   = useRouter()
  const [isPending, start] = useTransition()
  const today    = new Date().toISOString().split("T")[0]

  const pre = preselectedConsignment
  const preDescriptions = pre ? parseDescriptions(pre.description) : []

  const [form, setForm] = useState({
    partyId:       pre?.consignor.id ?? "",
    consignmentId: pre?.id ?? "",
    billDate:      today,
    dueDate:       "",
    subtotal:      pre ? String(pre.freightAmount) : "",
    gstRate:       "5",
    isInterstate:  pre
      ? (pre.consignor.state !== pre.consignee.state ? true : false)
      : false,
    notes:         "",
  })

  const [availableDescriptions, setAvailableDescriptions] = useState<string[]>(preDescriptions)
  const [selectedDescriptions, setSelectedDescriptions]   = useState<string[]>(preDescriptions)

  function toggleDesc(d: string) {
    setSelectedDescriptions((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })) }

  // Auto-detect interstate when consignment changes
  function handleConsignmentChange(cId: string) {
    set("consignmentId", cId)
    const c = unbilledConsignments.find((x) => x.id === cId)
    if (c) {
      set("subtotal", String(c.freightAmount))
      const descs = parseDescriptions(c.description)
      setAvailableDescriptions(descs)
      setSelectedDescriptions(descs)
    } else {
      setAvailableDescriptions([])
      setSelectedDescriptions([])
    }
  }

  // Auto-detect interstate when party changes
  function handlePartyChange(pId: string) {
    set("partyId", pId)
    const company = companies.find((c) => c.id === pId)
    if (company) {
      const interstate = (company.state ?? "") !== companyState
      set("isInterstate", interstate)
      // Auto-fill due date from creditDays
      if (company.creditDays) {
        const due = new Date()
        due.setDate(due.getDate() + company.creditDays)
        set("dueDate", due.toISOString().split("T")[0])
      }
    }
  }

  const subtotal    = Number(form.subtotal) || 0
  const rate        = Number(form.gstRate) / 100
  const cgst        = form.isInterstate ? 0 : +(subtotal * rate / 2).toFixed(2)
  const sgst        = form.isInterstate ? 0 : +(subtotal * rate / 2).toFixed(2)
  const igst        = form.isInterstate ? +(subtotal * rate).toFixed(2) : 0
  const totalAmount = +(subtotal + cgst + sgst + igst).toFixed(2)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partyId)   { toast.error("Select party (consignor)"); return }
    if (!form.subtotal)  { toast.error("Enter freight amount"); return }

    const data: CreateBillInput = {
      partyId:            form.partyId,
      consignmentId:      form.consignmentId || null,
      billDate:           form.billDate,
      dueDate:            form.dueDate || null,
      subtotal:           subtotal,
      gstRate:            Number(form.gstRate),
      isInterstate:       form.isInterstate,
      contentDescription: selectedDescriptions.length > 0 ? selectedDescriptions.join(", ") : null,
      notes:              form.notes || null,
    }

    start(async () => {
      const r = await createBill(data)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success(`Bill ${r.billNumber} created!`)
      router.push(`/billing/${r.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Consignment Link */}
      <div className="glass rounded-2xl p-6">
        <S>Link Consignment</S>
        {pre ? (
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.10)" }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">Linked GR</p>
              <p className="text-[14px] font-bold text-brand-700 font-mono mt-0.5">{pre.lrNumber}</p>
            </div>
          </div>
        ) : (
          <F label="Link to Consignment (Optional)">
            <select className="input-field bg-white" value={form.consignmentId}
                    onChange={(e) => handleConsignmentChange(e.target.value)}>
              <option value="">No consignment / standalone bill</option>
              {unbilledConsignments.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lrNumber} — {c.consignor.name} — {c.fromCity}→{c.toCity} — ₹{c.freightAmount.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </F>
        )}
      </div>

      {/* Bill Details */}
      <div className="glass rounded-2xl p-6">
        <S>Bill Details</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Party (Consignor / Billed To)" required>
            <select className="input-field bg-white" value={form.partyId}
                    onChange={(e) => handlePartyChange(e.target.value)} required>
              <option value="">Select company...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Bill Date" required>
            <input type="date" className="input-field" value={form.billDate}
                   onChange={(e) => set("billDate", e.target.value)} required />
          </F>
          <F label="Due Date">
            <input type="date" className="input-field" value={form.dueDate}
                   onChange={(e) => set("dueDate", e.target.value)} />
          </F>
          {availableDescriptions.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-2">
                Content Description for Invoice
              </label>
              <div className="flex flex-wrap gap-2">
                {availableDescriptions.map((d) => {
                  const checked = selectedDescriptions.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDesc(d)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors"
                      style={checked ? {
                        background: "rgba(13,43,26,0.85)", color: "#fff",
                        border: "1px solid rgba(13,43,26,0.85)",
                      } : {
                        background: "rgba(13,43,26,0.05)", color: "rgba(13,43,26,0.7)",
                        border: "1px solid rgba(13,43,26,0.12)",
                      }}
                    >
                      <span className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0"
                            style={checked ? { background: "#fff", borderColor: "#fff" } : { borderColor: "currentColor" }}>
                        {checked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3L3.5 5.5L8 1" stroke="rgba(13,43,26,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {d}
                    </button>
                  )
                })}
              </div>
              {selectedDescriptions.length > 0 && (
                <p className="text-[11.5px] text-brand-900/40 mt-2">
                  Invoice will show: <span className="font-medium text-brand-900/60">{selectedDescriptions.join(", ")}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GST & Amount */}
      <div className="glass rounded-2xl p-6">
        <S>Amount & GST</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Freight Amount (₹)" required>
            <input type="number" className="input-field font-semibold" placeholder="Base freight"
                   min={0} value={form.subtotal}
                   onChange={(e) => set("subtotal", e.target.value)} required />
          </F>
          <F label="GST Rate">
            <select className="input-field bg-white" value={form.gstRate}
                    onChange={(e) => set("gstRate", e.target.value)}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}% GST</option>)}
            </select>
          </F>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${
                form.isInterstate ? "bg-brand-700" : "bg-brand-900/20"
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
                  form.isInterstate ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </div>
              <input type="checkbox" className="sr-only"
                     checked={form.isInterstate}
                     onChange={(e) => set("isInterstate", e.target.checked)} />
              <span className="text-[13px] font-semibold text-brand-900">
                Interstate supply (IGST applies)
              </span>
            </label>
          </div>
        </div>

        {/* Tax breakdown */}
        <div className="mt-5 rounded-xl p-4 space-y-2"
             style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.08)" }}>
          <div className="flex justify-between text-[13px]">
            <span className="text-brand-900/50">Subtotal</span>
            <span className="font-semibold text-brand-900">₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          {form.isInterstate ? (
            <div className="flex justify-between text-[13px]">
              <span className="text-brand-900/50">IGST ({form.gstRate}%)</span>
              <span className="font-semibold text-brand-900">₹{igst.toLocaleString("en-IN")}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-900/50">CGST ({Number(form.gstRate) / 2}%)</span>
                <span className="font-semibold text-brand-900">₹{cgst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-900/50">SGST ({Number(form.gstRate) / 2}%)</span>
                <span className="font-semibold text-brand-900">₹{sgst.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
          <div className="h-px bg-brand-900/10" />
          <div className="flex justify-between">
            <span className="text-[14px] font-bold text-brand-900">Total Amount</span>
            <span className="text-[18px] font-bold text-brand-900">₹{totalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="glass rounded-2xl p-6">
        <S>Notes</S>
        <textarea className="input-field resize-none" rows={2} placeholder="Any notes for this bill..."
                  value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending || !form.partyId}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? "Creating..." : "Create Bill"}
        </button>
      </div>
    </form>
  )
}
