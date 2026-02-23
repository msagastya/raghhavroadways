import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default async function EditBillingPartyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const party = await prisma.party.findUnique({ where: { id, type: "BILLING_PARTY" } })
  if (!party) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Edit: ${party.name}`}
        subtitle="Update billing party details"
        backHref={`/parties/billing-parties/${id}`}
        backLabel="Back to party"
      />
      <PartyForm
        type="BILLING_PARTY"
        mode="edit"
        initialData={{
          id: party.id,
          name: party.name,
          phone: party.phone ?? "",
          altPhone: party.altPhone ?? "",
          email: party.email ?? "",
          address: party.address ?? "",
          city: party.city ?? "",
          state: party.state ?? "",
          pincode: party.pincode ?? "",
          gstin: party.gstin ?? "",
          pan: party.pan ?? "",
          creditDays: party.creditDays,
          creditLimit: party.creditLimit,
          notes: party.notes ?? "",
          isActive: party.isActive,
        }}
      />
    </div>
  )
}
