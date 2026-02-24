"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createVehicle, updateVehicle, type VehicleInput } from "@/actions/vehicles"
import toast from "react-hot-toast"
import { Loader2, Save } from "lucide-react"

const VEHICLE_TYPES = [
  { value: "TRUCK",      label: "Truck (Heavy)" },
  { value: "TRAILER",    label: "Trailer / Semi-trailer" },
  { value: "TEMPO",      label: "Tempo / Mini Truck" },
  { value: "CONTAINER",  label: "Container Truck" },
  { value: "TANKER",     label: "Tanker" },
  { value: "OPEN_BODY",  label: "Open Body / Platform" },
  { value: "FLATBED",    label: "Flatbed" },
  { value: "OTHER",      label: "Other" },
]

const STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ON_TRIP",   label: "On Trip" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "INACTIVE",  label: "Inactive" },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-bold uppercase tracking-widest text-brand-900/40">{children}</span>
      <div className="flex-1 h-px bg-brand-900/8" />
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

interface Props {
  mode: "create" | "edit"
  owners: { id: string; name: string; phone: string | null }[]
  initialData?: VehicleInput & { id?: string }
}

export default function VehicleForm({ mode, owners, initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    vehicleNumber: initialData?.vehicleNumber ?? "",
    type:          initialData?.type          ?? "TRUCK",
    capacity:      initialData?.capacity      ?? "",
    ownerId:       initialData?.ownerId       ?? "",
    status:        initialData?.status        ?? "AVAILABLE",
    notes:         initialData?.notes         ?? "",
  })

  function set(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vehicleNumber.trim()) { toast.error("Vehicle number is required"); return }
    if (!form.ownerId)               { toast.error("Select a vehicle owner");     return }

    const data: VehicleInput = {
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
      type:          form.type,
      capacity:      form.capacity ? Number(form.capacity) : null,
      ownerId:       form.ownerId,
      status:        form.status as any,
      notes:         form.notes || undefined,
    }

    startTransition(async () => {
      if (mode === "create") {
        const r = await createVehicle(data)
        if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
        toast.success("Vehicle added!")
        router.push(`/vehicles/${r.id}`)
      } else {
        const r = await updateVehicle(initialData!.id!, data)
        if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
        toast.success("Updated!")
        router.push(`/vehicles/${initialData!.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass rounded-2xl p-4 md:p-6">
        <SectionTitle>Vehicle Details</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Vehicle Number" required>
            <input
              className="input-field uppercase font-mono"
              placeholder="e.g. MH12AB1234"
              value={form.vehicleNumber}
              onChange={(e) => set("vehicleNumber", e.target.value.toUpperCase())}
              required
            />
          </Field>

          <Field label="Vehicle Type" required>
            <select className="input-field bg-white" value={form.type}
                    onChange={(e) => set("type", e.target.value)}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Capacity (Tons)">
            <input
              type="number" className="input-field" placeholder="e.g. 20" min={0} step="0.5"
              value={form.capacity} onChange={(e) => set("capacity", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select className="input-field bg-white" value={form.status}
                    onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 md:p-6">
        <SectionTitle>Vehicle Owner</SectionTitle>
        <Field label="Owner" required>
          <select className="input-field bg-white" value={form.ownerId}
                  onChange={(e) => set("ownerId", e.target.value)} required>
            <option value="">Select vehicle owner...</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}{o.phone ? ` — ${o.phone}` : ""}
              </option>
            ))}
          </select>
        </Field>
        {owners.length === 0 && (
          <p className="text-[12.5px] text-amber-600 mt-2">
            No vehicle owners found.{" "}
            <a href="/parties/vehicle-owners/new" className="underline font-semibold">Add one first.</a>
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-4 md:p-6">
        <SectionTitle>Notes</SectionTitle>
        <textarea className="input-field resize-none" rows={3} placeholder="Any notes about this vehicle..."
                  value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? "Saving..." : mode === "create" ? "Add Vehicle" : "Save Changes"}
        </button>
      </div>
    </form>
  )
}
