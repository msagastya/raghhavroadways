"use client"

import { useTransition } from "react"
import { updateBillStatus, cancelBill } from "@/actions/billing"
import { BillStatus } from "@prisma/client"
import toast from "react-hot-toast"
import { Loader2, ChevronRight, X, Send, FileCheck } from "lucide-react"

const NEXT_STATUS: Partial<Record<BillStatus, { status: BillStatus; label: string; style: string }[]>> = {
  DRAFT:          [{ status: "GENERATED", label: "Mark Generated", style: "bg-violet-600 hover:bg-violet-700" }],
  GENERATED:      [{ status: "SENT",      label: "Mark Sent",      style: "bg-blue-600 hover:bg-blue-700" }],
  SENT:           [],
  PARTIALLY_PAID: [],
}

const CANCELLABLE: BillStatus[] = ["DRAFT", "GENERATED", "SENT"]

export default function BillActions({
  billId,
  currentStatus,
}: {
  billId: string
  currentStatus: BillStatus
}) {
  const [isPending, start] = useTransition()

  const nextOptions = NEXT_STATUS[currentStatus] ?? []
  const canCancel   = CANCELLABLE.includes(currentStatus)

  if (nextOptions.length === 0 && !canCancel) {
    return (
      <p className="text-[13px] text-brand-900/40">
        {currentStatus === "PAID"
          ? "This bill is fully paid."
          : currentStatus === "CANCELLED"
          ? "This bill has been cancelled."
          : "Awaiting payment — record payments above."}
      </p>
    )
  }

  function handleUpdate(status: BillStatus, label: string) {
    start(async () => {
      const r = await updateBillStatus(billId, status)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success(`Bill marked as ${label}`)
    })
  }

  function handleCancel() {
    start(async () => {
      const r = await cancelBill(billId)
      if (!r.success) { toast.error(r.error ?? "An error occurred"); return }
      toast.success("Bill cancelled")
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextOptions.map((opt) => (
        <button
          key={opt.status}
          onClick={() => handleUpdate(opt.status, opt.label)}
          disabled={isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all ${opt.style}`}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} strokeWidth={2.5} />}
          {opt.label}
        </button>
      ))}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-all"
        >
          <X size={14} /> Cancel Bill
        </button>
      )}
    </div>
  )
}
