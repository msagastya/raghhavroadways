"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createConsignment, type ConsignmentInput } from "@/actions/consignments"
import toast from "react-hot-toast"
import { Loader2, Save, Plus, X } from "lucide-react"
import { INDIAN_STATES, CITIES_BY_STATE } from "@/lib/locations"
import DocumentUpload from "@/components/ui/DocumentUpload"

function S({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">{children}</span>
      <div className="flex-1 h-px bg-brand-900/8" />
    </div>
  )
}

function F({ label, children, required, half }: {
  label: string; children: React.ReactNode; required?: boolean; half?: boolean
}) {
  return (
    <div className={half ? "" : ""}>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

interface Party { id: string; name: string; phone: string | null }
interface Vehicle { id: string; vehicleNumber: string; type: string; owner: { name: string } }

interface Props {
  companies:   Party[]
  allParties:  Party[]
  agents:      Party[]
  vehicles:    Vehicle[]
}

export default function ConsignmentForm({ companies, allParties, agents, vehicles }: Props) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const today = new Date().toISOString().split("T")[0]

  const [descriptions, setDescriptions] = useState<string[]>([])
  const [descInput,    setDescInput]    = useState("")

  function addDesc() {
    const v = descInput.trim()
    if (!v) return
    if (descriptions.includes(v)) { toast.error("Already added"); return }
    setDescriptions((p) => [...p, v])
    setDescInput("")
  }
  function removeDesc(i: number) { setDescriptions((p) => p.filter((_, idx) => idx !== i)) }

  const [form, setForm] = useState({
    bookingDate:    today,
    consignorId:    "",
    consigneeId:    "",
    agentId:        "",
    fromCity:       "",
    fromState:      "",
    toCity:         "",
    toState:        "",
    freightType:    "FTL",
    weight:         "",
    quantity:       "",
    unit:           "",
    declaredValue:  "",
    freightAmount:  "",
    paymentType:    "TBB",
    ewayBillNumber:   "",
    ewayBillDocUrl:   "",
    invoiceChallanNo: "",
    challanDocUrl:    "",
    vehicleId:        "",
    driverName:     "",
    driverPhone:    "",
    vehicleFreight: "",
    advancePaid:    "",
    notes:          "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.consignorId)      { toast.error("Select consignor"); return }
    if (!form.consigneeId)      { toast.error("Select consignee"); return }
    if (!form.fromCity)         { toast.error("Enter origin city"); return }
    if (!form.toCity)           { toast.error("Enter destination city"); return }
    if (descriptions.length === 0) { toast.error("Add at least one content description"); return }
    if (!form.freightAmount)    { toast.error("Enter freight amount"); return }

    const data: ConsignmentInput = {
      bookingDate:    form.bookingDate,
      consignorId:    form.consignorId,
      consigneeId:    form.consigneeId,
      agentId:        form.agentId || null,
      fromCity:       form.fromCity.trim(),
      fromState:      form.fromState,
      toCity:         form.toCity.trim(),
      toState:        form.toState,
      description:    JSON.stringify(descriptions),
      freightType:    form.freightType as ConsignmentInput["freightType"],
      weight:         form.weight        ? Number(form.weight)        : null,
      quantity:       form.quantity      ? Number(form.quantity)      : null,
      unit:           form.unit          || null,
      declaredValue:  form.declaredValue ? Number(form.declaredValue) : null,
      freightAmount:  Number(form.freightAmount),
      paymentType:    form.paymentType as ConsignmentInput["paymentType"],
      ewayBillNumber:   form.ewayBillNumber   || null,
      ewayBillDocUrl:   form.ewayBillDocUrl   || null,
      invoiceChallanNo: form.invoiceChallanNo || null,
      challanDocUrl:    form.challanDocUrl    || null,
      vehicleId:        form.vehicleId        || null,
      driverName:     form.driverName    || null,
      driverPhone:    form.driverPhone   || null,
      vehicleFreight: form.vehicleFreight ? Number(form.vehicleFreight) : null,
      advancePaid:    form.advancePaid   ? Number(form.advancePaid)   : 0,
      notes:          form.notes         || null,
    }

    start(async () => {
      const r = await createConsignment(data)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success(`Consignment booked! GR: ${r.lrNumber}`)
      router.push(`/consignments/${r.id}`)
    })
  }

  const balancePayable = (Number(form.vehicleFreight) || 0) - (Number(form.advancePaid) || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Booking Details */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Booking Details</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Booking Date" required>
            <input type="date" className="input-field" value={form.bookingDate}
                   onChange={(e) => set("bookingDate", e.target.value)} required />
          </F>
          <div className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.08)" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">GR Number</p>
              <p className="text-[14px] font-bold text-brand-900 mt-0.5">Auto-generated on save</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Parties</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Consignor (Sender)" required>
            <select className="input-field bg-white" value={form.consignorId}
                    onChange={(e) => set("consignorId", e.target.value)} required>
              <option value="">Select company / sender...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Consignee (Receiver)" required>
            <select className="input-field bg-white" value={form.consigneeId}
                    onChange={(e) => set("consigneeId", e.target.value)} required>
              <option value="">Select receiver...</option>
              {allParties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
          <F label="Agent (Optional)">
            <select className="input-field bg-white" value={form.agentId}
                    onChange={(e) => set("agentId", e.target.value)}>
              <option value="">No agent / Direct</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </F>
        </div>
      </div>

      {/* Route */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Route</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-brand-900/50 uppercase tracking-wider">Origin</p>
            <F label="From State" required>
              <select className="input-field" value={form.fromState}
                      onChange={(e) => { set("fromState", e.target.value); set("fromCity", "") }} required>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="From City" required>
              <select className="input-field" value={form.fromCity}
                      onChange={(e) => set("fromCity", e.target.value)}
                      disabled={!form.fromState} required>
                <option value="">{form.fromState ? "Select city" : "Select state first"}</option>
                {(CITIES_BY_STATE[form.fromState] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
          </div>
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-brand-900/50 uppercase tracking-wider">Destination</p>
            <F label="To State" required>
              <select className="input-field" value={form.toState}
                      onChange={(e) => { set("toState", e.target.value); set("toCity", "") }} required>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </F>
            <F label="To City" required>
              <select className="input-field" value={form.toCity}
                      onChange={(e) => set("toCity", e.target.value)}
                      disabled={!form.toState} required>
                <option value="">{form.toState ? "Select city" : "Select state first"}</option>
                {(CITIES_BY_STATE[form.toState] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
          </div>
        </div>
      </div>

      {/* Cargo */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Cargo Details</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
              Content Description<span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="e.g. Cotton Bales, Auto Parts…"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDesc() } }}
              />
              <button
                type="button"
                onClick={addDesc}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "rgba(13,43,26,0.85)" }}
              >
                <Plus size={14} strokeWidth={2.5} /> Add
              </button>
            </div>
            {descriptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {descriptions.map((d, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1 rounded-full"
                        style={{ background: "rgba(13,43,26,0.07)", border: "1px solid rgba(13,43,26,0.12)" }}>
                    {d}
                    <button type="button" onClick={() => removeDesc(i)} className="text-brand-900/40 hover:text-red-500 transition-colors">
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <F label="Freight Type" required>
            <select className="input-field bg-white" value={form.freightType}
                    onChange={(e) => set("freightType", e.target.value)}>
              <option value="FTL">FTL (Full Truck Load)</option>
              <option value="LTL">LTL (Part Load)</option>
              <option value="WEIGHT_BASIS">Weight Basis</option>
              <option value="OTHER">Other</option>
            </select>
          </F>
          {(form.freightType === "WEIGHT_BASIS" || form.freightType === "LTL") && (
            <F label="Weight (KG)">
              <input type="number" className="input-field" placeholder="e.g. 5000" min={0}
                     value={form.weight} onChange={(e) => set("weight", e.target.value)} />
            </F>
          )}
          <F label="Quantity">
            <input type="number" className="input-field" placeholder="e.g. 100" min={0}
                   value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </F>
          <F label="Unit">
            <input type="text" className="input-field" placeholder="e.g. Bags, Boxes, MT"
                   value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </F>
          <F label="Declared Value (₹)">
            <input type="number" className="input-field" placeholder="Insurance value" min={0}
                   value={form.declaredValue} onChange={(e) => set("declaredValue", e.target.value)} />
          </F>
        </div>
      </div>

      {/* Freight & Payment */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Freight & Payment</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Freight Amount (₹)" required>
            <input type="number" className="input-field font-semibold" placeholder="Amount company pays us"
                   min={0} value={form.freightAmount}
                   onChange={(e) => set("freightAmount", e.target.value)} required />
          </F>
          <F label="Payment Type">
            <select className="input-field bg-white" value={form.paymentType}
                    onChange={(e) => set("paymentType", e.target.value)}>
              <option value="TBB">TBB (To Be Billed)</option>
              <option value="PAID">Paid (Already Paid)</option>
              <option value="TO_PAY">To Pay (Consignee Pays)</option>
            </select>
          </F>
          <F label="E-way Bill Number">
            <input type="text" className="input-field font-mono" placeholder="12-digit EWB number"
                   maxLength={12} value={form.ewayBillNumber}
                   onChange={(e) => set("ewayBillNumber", e.target.value)} />
          </F>
          <F label="Invoice / Challan No.">
            <input type="text" className="input-field font-mono" placeholder="Supplier invoice or challan number"
                   value={form.invoiceChallanNo}
                   onChange={(e) => set("invoiceChallanNo", e.target.value)} />
          </F>
        </div>
      </div>

      {/* Documents */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Documents</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DocumentUpload
            label="E-Way Bill Document"
            value={form.ewayBillDocUrl}
            folder="eway-bills"
            onUpload={(url) => set("ewayBillDocUrl", url)}
            onRemove={() => set("ewayBillDocUrl", "")}
          />
          <DocumentUpload
            label="Invoice / Challan Document"
            value={form.challanDocUrl}
            folder="challans"
            onUpload={(url) => set("challanDocUrl", url)}
            onRemove={() => set("challanDocUrl", "")}
          />
        </div>
      </div>

      {/* Vehicle Assignment */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Vehicle Assignment (Optional)</S>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Vehicle">
            <select className="input-field bg-white" value={form.vehicleId}
                    onChange={(e) => set("vehicleId", e.target.value)}>
              <option value="">Not assigned yet</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} — {v.owner.name}
                </option>
              ))}
            </select>
          </F>
          <div /> {/* spacer */}
          <F label="Driver Name">
            <input type="text" className="input-field" placeholder="Driver's full name"
                   value={form.driverName} onChange={(e) => set("driverName", e.target.value)} />
          </F>
          <F label="Driver Phone">
            <input type="tel" className="input-field" placeholder="Driver's mobile"
                   value={form.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} />
          </F>
        </div>
      </div>

      {/* Vehicle Payment */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Vehicle Owner Payment</S>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <F label="Vehicle Freight (₹)">
            <input type="number" className="input-field" placeholder="Total we pay to vehicle owner"
                   min={0} value={form.vehicleFreight}
                   onChange={(e) => set("vehicleFreight", e.target.value)} />
          </F>
          <F label="Advance (₹)">
            <input type="number" className="input-field" placeholder="Advance now"
                   min={0} value={form.advancePaid}
                   onChange={(e) => set("advancePaid", e.target.value)} />
          </F>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-900/40 mb-1.5">Balance Payable</p>
            <div className="p-2.5 rounded-xl text-center"
                 style={{ background: "rgba(13,43,26,0.05)", border: "1px solid rgba(13,43,26,0.08)" }}>
              <p className="text-[18px] font-bold text-brand-900">
                ₹{balancePayable > 0 ? balancePayable.toLocaleString("en-IN") : "0"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="glass rounded-2xl p-4 md:p-6">
        <S>Notes</S>
        <textarea className="input-field resize-none" rows={3} placeholder="Any special instructions or remarks..."
                  value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? "Booking..." : "Book Consignment"}
        </button>
      </div>
    </form>
  )
}
