"use client"

import { useState, useTransition } from "react"
import { updateConsignmentStatus } from "@/actions/consignments"
import { ConsignmentStatus } from "@prisma/client"
import toast from "react-hot-toast"
import { Loader2, ChevronRight, X } from "lucide-react"

const NEXT_STATUSES: Partial<Record<ConsignmentStatus, ConsignmentStatus[]>> = {
  BOOKED:         ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT:     ["DELIVERED",  "CANCELLED"],
  DELIVERED:      ["BILLED",     "CANCELLED"],
  BILLED:         ["PARTIALLY_PAID", "PAID"],
  PARTIALLY_PAID: ["PAID"],
}

const STATUS_LABELS: Record<ConsignmentStatus, string> = {
  BOOKED:         "Booked",
  IN_TRANSIT:     "In Transit",
  DELIVERED:      "Delivered",
  BILLED:         "Billed",
  PARTIALLY_PAID: "Partially Paid",
  PAID:           "Paid",
  CANCELLED:      "Cancelled",
}

const STATUS_STYLES: Partial<Record<ConsignmentStatus, string>> = {
  IN_TRANSIT:     "bg-amber-600 hover:bg-amber-700",
  DELIVERED:      "bg-emerald-600 hover:bg-emerald-700",
  BILLED:         "bg-violet-600 hover:bg-violet-700",
  PARTIALLY_PAID: "bg-orange-500 hover:bg-orange-600",
  PAID:           "bg-green-600 hover:bg-green-700",
  CANCELLED:      "bg-red-500 hover:bg-red-600",
}

export default function StatusUpdateButton({
  consignmentId,
  currentStatus,
}: {
  consignmentId: string
  currentStatus: ConsignmentStatus
}) {
  const [isPending, start] = useTransition()
  const [note, setNote]   = useState("")
  const [active, setActive] = useState<ConsignmentStatus | null>(null)

  const nextStatuses = NEXT_STATUSES[currentStatus] ?? []

  if (nextStatuses.length === 0) return null

  function handleUpdate(status: ConsignmentStatus) {
    start(async () => {
      const r = await updateConsignmentStatus(consignmentId, status, note || undefined)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success(`Status updated to "${STATUS_LABELS[status]}"`)
      setActive(null)
      setNote("")
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((s) => (
          <button
            key={s}
            onClick={() => setActive(active === s ? null : s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all ${STATUS_STYLES[s] ?? "bg-brand-900 hover:bg-brand-800"}`}
            disabled={isPending}
          >
            <ChevronRight size={14} strokeWidth={2.5} />
            Mark as {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {active && (
        <div className="p-4 rounded-xl space-y-3"
             style={{ background: "rgba(13,43,26,0.04)", border: "1px solid rgba(13,43,26,0.10)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-brand-900">
              Mark as <span className="text-brand-700">{STATUS_LABELS[active]}</span>
            </p>
            <button onClick={() => setActive(null)} className="text-brand-900/40 hover:text-brand-900/70">
              <X size={15} />
            </button>
          </div>
          <input
            type="text"
            className="input-field text-[13px]"
            placeholder="Optional note (e.g. Delivered at 3 PM)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={() => handleUpdate(active)}
            disabled={isPending}
            className={`btn-primary text-[13px] ${STATUS_STYLES[active] ?? ""}`}
            style={{ padding: "8px 18px" }}
          >
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
              : <>Confirm: {STATUS_LABELS[active]}</>}
          </button>
        </div>
      )}
    </div>
  )
}
