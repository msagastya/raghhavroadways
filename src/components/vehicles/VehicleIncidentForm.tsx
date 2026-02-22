"use client"

import { useState, useTransition } from "react"
import { addVehicleIncident, resolveIncident } from "@/actions/vehicles"
import toast from "react-hot-toast"
import { Plus, Loader2, CheckCircle2, AlertTriangle, ChevronUp } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Incident {
  id: string
  date: Date
  description: string
  cost: number | null
  status: string
  resolution: string | null
}

export default function VehicleIncidentForm({
  vehicleId,
  incidents,
}: {
  vehicleId: string
  incidents: Incident[]
}) {
  const [open, setOpen]              = useState(false)
  const [isPending, startTransition] = useTransition()
  const [resolvingId, setResolvingId]= useState<string | null>(null)
  const [resolution, setResolution]  = useState("")

  const [form, setForm] = useState<{ date: string; description: string; cost: string }>({
    date:        new Date().toISOString().split("T")[0],
    description: "",
    cost:        "",
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { toast.error("Description is required"); return }
    startTransition(async () => {
      const r = await addVehicleIncident(vehicleId, {
        date:        form.date,
        description: form.description,
        cost:        form.cost ? Number(form.cost) : null,
      })
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Incident logged!")
      setForm({ date: new Date().toISOString().split("T")[0], description: "", cost: "" })
      setOpen(false)
    })
  }

  function handleResolve(incidentId: string) {
    if (!resolution.trim()) { toast.error("Enter resolution details"); return }
    startTransition(async () => {
      const r = await resolveIncident(incidentId, vehicleId, resolution)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Incident resolved!")
      setResolvingId(null)
      setResolution("")
    })
  }

  return (
    <div>
      {incidents.length > 0 ? (
        <div className="divide-y divide-brand-900/6">
          {incidents.map((inc) => (
            <div key={inc.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    inc.status === "RESOLVED" ? "bg-green-50" : "bg-amber-50"
                  }`}>
                    {inc.status === "RESOLVED"
                      ? <CheckCircle2 size={14} className="text-green-600" />
                      : <AlertTriangle size={14} className="text-amber-600" />}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-brand-900">{inc.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-brand-900/45">
                      <span>{formatDate(inc.date)}</span>
                      {inc.cost && <span className="font-semibold text-brand-900/60">Cost: {formatCurrency(inc.cost)}</span>}
                      <span className={`font-semibold ${inc.status === "RESOLVED" ? "text-green-600" : "text-amber-600"}`}>
                        {inc.status}
                      </span>
                    </div>
                    {inc.resolution && (
                      <p className="text-[12px] text-brand-900/55 mt-1 italic">
                        Resolution: {inc.resolution}
                      </p>
                    )}
                  </div>
                </div>

                {inc.status === "OPEN" && (
                  resolvingId === inc.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        className="input-field text-[12px]"
                        placeholder="Resolution details..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        style={{ padding: "6px 10px", width: "180px" }}
                      />
                      <button onClick={() => handleResolve(inc.id)}
                              className="btn-primary text-[12px]" disabled={isPending}
                              style={{ padding: "6px 12px" }}>
                        {isPending ? <Loader2 size={13} className="animate-spin" /> : "Save"}
                      </button>
                      <button onClick={() => { setResolvingId(null); setResolution("") }}
                              className="btn-outline text-[12px]" style={{ padding: "6px 12px" }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setResolvingId(inc.id)}
                            className="btn-outline text-[12px] shrink-0"
                            style={{ padding: "5px 12px" }}>
                      <CheckCircle2 size={13} /> Resolve
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <AlertTriangle size={24} className="mx-auto text-brand-900/20 mb-2" />
          <p className="text-[13px] text-brand-900/35">No incidents logged</p>
        </div>
      )}

      <div className="px-5 py-3 border-t border-brand-900/6">
        <button type="button" onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-[13px] font-semibold text-brand-700 hover:text-brand-900 transition-colors">
          {open ? <ChevronUp size={15} /> : <Plus size={15} />}
          {open ? "Cancel" : "Log Incident"}
        </button>

        {open && (
          <form onSubmit={handleAdd} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Date *</label>
              <input type="date" className="input-field text-[13px]" required
                     value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Description *</label>
              <input type="text" className="input-field text-[13px]" required
                     placeholder="e.g. Front tyre puncture on highway"
                     value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Repair Cost (₹)</label>
              <input type="number" className="input-field text-[13px]" placeholder="0"
                     min={0} value={form.cost} onChange={(e) => set("cost", e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary text-[13px] w-full" disabled={isPending}
                      style={{ padding: "9px 16px" }}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Log
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
