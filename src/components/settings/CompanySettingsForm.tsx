"use client"

import { useState, useTransition } from "react"
import { saveCompanySettings } from "@/actions/settings"
import toast from "react-hot-toast"
import { Loader2, Save } from "lucide-react"
import { CITIES_BY_STATE } from "@/lib/locations"

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function CompanySettingsForm({
  settings,
  states,
}: {
  settings: Record<string, string>
  states:   string[]
}) {
  const [isPending, start] = useTransition()
  const [form, setForm] = useState({
    company_name: settings["company_name"] ?? "Raghhav Roadways",
    gst_number:   settings["gst_number"]   ?? "",
    pan:          settings["pan"]           ?? "",
    address:      settings["address"]       ?? "",
    city:         settings["city"]          ?? "",
    state:        settings["state"]         ?? "",
    pincode:      settings["pincode"]       ?? "",
    phone:        settings["phone"]         ?? "",
    email:        settings["email"]         ?? "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await saveCompanySettings(form)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Company details saved!")
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <F label="Company Name">
            <input type="text" className="input-field" value={form.company_name}
                   onChange={(e) => set("company_name", e.target.value)} />
          </F>
        </div>
        <F label="GSTIN">
          <input type="text" className="input-field font-mono uppercase"
                 placeholder="22AAAAA0000A1Z5" maxLength={15}
                 value={form.gst_number} onChange={(e) => set("gst_number", e.target.value.toUpperCase())} />
        </F>
        <F label="PAN">
          <input type="text" className="input-field font-mono uppercase"
                 placeholder="AAAAA0000A" maxLength={10}
                 value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} />
        </F>
        <F label="Phone">
          <input type="tel" className="input-field" placeholder="+91 98765 43210"
                 value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </F>
        <F label="Email">
          <input type="email" className="input-field" placeholder="info@raghhav.com"
                 value={form.email} onChange={(e) => set("email", e.target.value)} />
        </F>
        <div className="md:col-span-2">
          <F label="Address">
            <input type="text" className="input-field" placeholder="Street / area"
                   value={form.address} onChange={(e) => set("address", e.target.value)} />
          </F>
        </div>
        <F label="State">
          <select className="input-field" value={form.state}
                  onChange={(e) => { set("state", e.target.value); set("city", "") }}>
            <option value="">Select state</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
        <F label="City">
          <select className="input-field" value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  disabled={!form.state}>
            <option value="">{form.state ? "Select city" : "Select state first"}</option>
            {(CITIES_BY_STATE[form.state] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
        <F label="Pin Code">
          <input type="text" className="input-field font-mono" placeholder="400001" maxLength={6}
                 value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
        </F>
      </div>
      <div className="flex justify-end mt-5">
        <button type="submit" className="btn-primary text-[13px]"
                style={{ padding: "9px 20px" }} disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? "Saving..." : "Save Details"}
        </button>
      </div>
    </form>
  )
}
