"use client"

import { useTransition } from "react"
import { togglePartyActive } from "@/actions/parties"
import { PartyType } from "@prisma/client"
import toast from "react-hot-toast"
import { ToggleLeft, ToggleRight, Loader2 } from "lucide-react"

export default function ToggleActiveButton({
  id,
  isActive,
  type,
}: {
  id: string
  isActive: boolean
  type: PartyType
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePartyActive(id, !isActive)
      if (result.success) {
        toast.success(isActive ? "Marked as inactive" : "Marked as active")
      } else {
        toast.error(result.error ?? "An error occurred")
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="btn-outline text-[13px] flex items-center gap-1.5"
      style={{ padding: "7px 14px" }}
      title={isActive ? "Deactivate" : "Activate"}
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isActive ? (
        <ToggleRight size={16} strokeWidth={2} className="text-green-600" />
      ) : (
        <ToggleLeft size={16} strokeWidth={2} className="text-brand-900/40" />
      )}
      {isActive ? "Active" : "Inactive"}
    </button>
  )
}
