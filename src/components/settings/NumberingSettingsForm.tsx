"use client"

import { useState, useTransition } from "react"
import { saveNumberingSettings } from "@/actions/settings"
import toast from "react-hot-toast"
import { Loader2, Save } from "lucide-react"

function currentFinancialYear(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() // 0-indexed; April = 3
  if (month >= 3) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

export default function NumberingSettingsForm({
  settings,
}: {
  settings: Record<string, string>
}) {
  const [isPending, start] = useTransition()
  const [form, setForm] = useState({
    lr_prefix:       settings["lr_prefix"]       ?? "GR",
    invoice_prefix:  settings["invoice_prefix"]  ?? "RR",
    invoice_series:  settings["invoice_series"]  ?? currentFinancialYear(),
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const r = await saveNumberingSettings(form)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Numbering settings saved!")
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            GR Prefix
          </label>
          <input type="text" className="input-field font-mono uppercase"
                 placeholder="GR" maxLength={6}
                 value={form.lr_prefix}
                 onChange={(e) => set("lr_prefix", e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Invoice Prefix
          </label>
          <input type="text" className="input-field font-mono uppercase"
                 placeholder="RR" maxLength={6}
                 value={form.invoice_prefix}
                 onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-brand-900/60 uppercase tracking-wide mb-1.5">
            Financial Year Series
          </label>
          <input type="text" className="input-field font-mono"
                 placeholder="2025-26" maxLength={10}
                 value={form.invoice_series}
                 onChange={(e) => set("invoice_series", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button type="submit" className="btn-primary text-[13px]"
                style={{ padding: "9px 20px" }} disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? "Saving..." : "Save Numbering"}
        </button>
      </div>
    </form>
  )
}
