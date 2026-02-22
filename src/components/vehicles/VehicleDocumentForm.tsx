"use client"

import { useState, useTransition } from "react"
import { addVehicleDocument, deleteVehicleDocument, type VehicleDocInput } from "@/actions/vehicles"
import toast from "react-hot-toast"
import { Plus, Loader2, Trash2, FileCheck, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/lib/utils"

const DOC_TYPES = [
  { value: "RC",          label: "RC (Registration Certificate)" },
  { value: "INSURANCE",   label: "Insurance" },
  { value: "FITNESS",     label: "Fitness Certificate" },
  { value: "PERMIT",      label: "Permit (National / State)" },
  { value: "POLLUTION",   label: "Pollution Under Control (PUC)" },
  { value: "OTHER",       label: "Other" },
]

interface Document {
  id: string
  type: string
  documentNo: string | null
  issueDate: Date | null
  expiryDate: Date | null
  notes: string | null
}

function isExpiringSoon(date: Date | null) {
  if (!date) return false
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000)
  return days >= 0 && days <= 30
}

function isExpired(date: Date | null) {
  if (!date) return false
  return date.getTime() < Date.now()
}

export default function VehicleDocumentForm({
  vehicleId,
  documents,
}: {
  vehicleId: string
  documents: Document[]
}) {
  const [open, setOpen]           = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting]   = useState<string | null>(null)

  const [form, setForm] = useState<VehicleDocInput>({
    type:       "RC",
    documentNo: "",
    issueDate:  "",
    expiryDate: "",
    notes:      "",
  })

  function set(k: keyof VehicleDocInput, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await addVehicleDocument(vehicleId, form)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Document added!")
      setForm({ type: "RC", documentNo: "", issueDate: "", expiryDate: "", notes: "" })
      setOpen(false)
    })
  }

  async function handleDelete(docId: string) {
    setDeleting(docId)
    const r = await deleteVehicleDocument(docId, vehicleId)
    setDeleting(null)
    if (!r.success) toast.error(r.error ?? "An error occurred")
    else toast.success("Document removed")
  }

  return (
    <div>
      {/* Existing documents */}
      {documents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="tms-table">
            <thead>
              <tr><th>Type</th><th>Doc No.</th><th>Issue Date</th><th>Expiry</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="font-semibold">{DOC_TYPES.find(t => t.value === d.type)?.label ?? d.type}</td>
                  <td className="font-mono text-[12.5px]">{d.documentNo ?? "—"}</td>
                  <td>{d.issueDate ? formatDate(d.issueDate) : "—"}</td>
                  <td>
                    {d.expiryDate ? (
                      <span className={
                        isExpired(d.expiryDate)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(d.expiryDate)
                          ? "text-amber-600 font-semibold"
                          : ""
                      }>
                        {formatDate(d.expiryDate)}
                        {isExpired(d.expiryDate)   && " ⚠ Expired"}
                        {isExpiringSoon(d.expiryDate) && !isExpired(d.expiryDate) && " ⚡ Soon"}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="text-brand-900/50 text-[12.5px]">{d.notes ?? "—"}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-brand-900/30 hover:text-red-500 transition-colors"
                    >
                      {deleting === d.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center">
          <FileCheck size={24} className="mx-auto text-brand-900/20 mb-2" />
          <p className="text-[13px] text-brand-900/35">No documents added yet</p>
        </div>
      )}

      {/* Add document toggle */}
      <div className="px-5 py-3 border-t border-brand-900/6">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-[13px] font-semibold text-brand-700 hover:text-brand-900 transition-colors"
        >
          {open ? <ChevronUp size={15} /> : <Plus size={15} />}
          {open ? "Cancel" : "Add Document"}
        </button>

        {open && (
          <form onSubmit={handleAdd} className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Type *</label>
              <select className="input-field bg-white text-[13px]" value={form.type}
                      onChange={(e) => set("type", e.target.value)} required>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Document No.</label>
              <input type="text" className="input-field text-[13px] font-mono" placeholder="Optional"
                     value={form.documentNo} onChange={(e) => set("documentNo", e.target.value)} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Issue Date</label>
              <input type="date" className="input-field text-[13px]"
                     value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Expiry Date</label>
              <input type="date" className="input-field text-[13px]"
                     value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-brand-900/50 mb-1">Notes</label>
              <input type="text" className="input-field text-[13px]" placeholder="Optional"
                     value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>

            <div className="flex items-end">
              <button type="submit" className="btn-primary text-[13px] w-full" disabled={isPending}
                      style={{ padding: "9px 16px" }}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
