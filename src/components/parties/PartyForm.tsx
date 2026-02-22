"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PartyType } from "@prisma/client"
import { createParty, updateParty, type PartyInput } from "@/actions/parties"
import toast from "react-hot-toast"
import { Loader2, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { INDIAN_STATES, CITIES_BY_STATE } from "@/lib/locations"

const TYPE_LABELS: Record<PartyType, string> = {
  COMPANY: "Company",
  AGENT: "Agent",
  VEHICLE_OWNER: "Vehicle Owner",
}

interface PartyFormProps {
  type: PartyType
  initialData?: PartyInput & { id?: string }
  mode: "create" | "edit"
}

function FieldGroup({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold uppercase tracking-wide mb-1.5"
             style={{ color: "#256b29" }}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #56a05a 0%, #1e5522 100%)" }} />
      <span className="text-[12px] font-black uppercase tracking-[0.12em]"
            style={{ color: "#1e5522" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(52,132,56,0.30) 0%, rgba(52,132,56,0.04) 100%)" }} />
    </div>
  )
}

export default function PartyForm({ type, initialData, mode }: PartyFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<PartyInput>({
    name:            initialData?.name ?? "",
    phone:           initialData?.phone ?? "",
    altPhone:        initialData?.altPhone ?? "",
    email:           initialData?.email ?? "",
    address:         initialData?.address ?? "",
    city:            initialData?.city ?? "",
    state:           initialData?.state ?? "",
    pincode:         initialData?.pincode ?? "",
    gstin:           initialData?.gstin ?? "",
    pan:             initialData?.pan ?? "",
    creditDays:      initialData?.creditDays ?? (type === "COMPANY" ? 45 : null),
    creditLimit:     initialData?.creditLimit ?? null,
    commissionType:  initialData?.commissionType ?? null,
    commissionValue: initialData?.commissionValue ?? null,
    notes:           initialData?.notes ?? "",
    isActive:        initialData?.isActive ?? true,
  })

  function set(field: keyof PartyInput, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const basePaths: Record<PartyType, string> = {
    COMPANY: "/parties/companies",
    AGENT: "/parties/agents",
    VEHICLE_OWNER: "/parties/vehicle-owners",
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    startTransition(async () => {
      if (mode === "create") {
        const result = await createParty(type, form)
        if (!result.success) {
          toast.error(result.error ?? "An error occurred")
          return
        }
        toast.success(`${TYPE_LABELS[type]} added successfully!`)
        router.push(`${basePaths[type]}/${result.id}`)
      } else {
        if (!initialData?.id) return
        const result = await updateParty(initialData.id, form)
        if (!result.success) {
          toast.error(result.error ?? "An error occurred")
          return
        }
        toast.success("Updated successfully!")
        router.push(`${basePaths[type]}/${initialData.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="form-card p-7">
        <SectionTitle>Basic Information</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label={`${TYPE_LABELS[type]} Name`} required>
            <input
              type="text"
              className="input-field"
              placeholder={type === "COMPANY" ? "e.g. Tata Motors Ltd." : "Full name"}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup label="Primary Phone">
            <input
              type="tel"
              className="input-field"
              placeholder="10-digit mobile number"
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Alternate Phone">
            <input
              type="tel"
              className="input-field"
              placeholder="Optional second number"
              value={form.altPhone ?? ""}
              onChange={(e) => set("altPhone", e.target.value)}
            />
          </FieldGroup>

          <FieldGroup label="Email">
            <input
              type="email"
              className="input-field"
              placeholder="email@example.com"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </FieldGroup>
        </div>
      </div>

      {/* Address */}
      <div className="form-card p-7">
        <SectionTitle>Address</SectionTitle>
        <div className="space-y-4">
          <FieldGroup label="Street Address">
            <input
              type="text"
              className="input-field"
              placeholder="House/Office No., Street, Area"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </FieldGroup>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldGroup label="State">
              <select
                className="input-field"
                value={form.state ?? ""}
                onChange={(e) => {
                  set("state", e.target.value)
                  set("city", "")
                }}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="City">
              <select
                className="input-field"
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                disabled={!form.state}
              >
                <option value="">
                  {form.state ? "Select city" : "Select state first"}
                </option>
                {(CITIES_BY_STATE[form.state ?? ""] ?? []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FieldGroup>
            <FieldGroup label="Pincode">
              <input
                type="text"
                className="input-field"
                placeholder="6-digit pincode"
                maxLength={6}
                value={form.pincode ?? ""}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </FieldGroup>
          </div>
        </div>
      </div>

      {/* Tax & Identity */}
      {(type === "COMPANY" || type === "AGENT") && (
        <div className="form-card p-7">
          <SectionTitle>Tax & Identity</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="GSTIN">
              <input
                type="text"
                className="input-field uppercase"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                value={form.gstin ?? ""}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              />
            </FieldGroup>
            <FieldGroup label="PAN">
              <input
                type="text"
                className="input-field uppercase"
                placeholder="AAAAA0000A"
                maxLength={10}
                value={form.pan ?? ""}
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
              />
            </FieldGroup>
          </div>
        </div>
      )}

      {/* Vehicle Owner PAN only */}
      {type === "VEHICLE_OWNER" && (
        <div className="form-card p-7">
          <SectionTitle>Identity</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="PAN">
              <input
                type="text"
                className="input-field uppercase"
                placeholder="AAAAA0000A"
                maxLength={10}
                value={form.pan ?? ""}
                onChange={(e) => set("pan", e.target.value.toUpperCase())}
              />
            </FieldGroup>
          </div>
        </div>
      )}

      {/* Commission — Agents only */}
      {type === "AGENT" && (
        <div className="form-card p-7">
          <SectionTitle>Commission</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="Commission Type">
              <select
                className="input-field"
                value={form.commissionType ?? ""}
                onChange={(e) => set("commissionType", e.target.value || null)}
              >
                <option value="">Not set / Varies</option>
                <option value="FIXED">Fixed amount per consignment</option>
                <option value="PERCENTAGE">Percentage of freight</option>
              </select>
            </FieldGroup>
            {form.commissionType && (
              <FieldGroup
                label={
                  form.commissionType === "PERCENTAGE"
                    ? "Commission Percentage (%)"
                    : "Fixed Amount (₹)"
                }
              >
                <input
                  type="number"
                  className="input-field"
                  placeholder={form.commissionType === "PERCENTAGE" ? "e.g. 2.5" : "e.g. 500"}
                  min={0}
                  step={form.commissionType === "PERCENTAGE" ? "0.01" : "1"}
                  value={form.commissionValue ?? ""}
                  onChange={(e) =>
                    set("commissionValue", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </FieldGroup>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="form-card p-7">
        <SectionTitle>Notes</SectionTitle>
        <textarea
          className="input-field resize-none"
          placeholder="Any additional notes about this party..."
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          className="btn-outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} strokeWidth={2} />
          )}
          {isPending
            ? "Saving..."
            : mode === "create"
            ? `Add ${TYPE_LABELS[type]}`
            : "Save Changes"}
        </button>
      </div>
    </form>
  )
}
