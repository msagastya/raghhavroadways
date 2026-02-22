import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default async function EditVehicleOwnerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const owner = await prisma.party.findUnique({ where: { id, type: "VEHICLE_OWNER" } })
  if (!owner) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Edit: ${owner.name}`}
        subtitle="Update vehicle owner details"
        backHref={`/parties/vehicle-owners/${id}`}
        backLabel="Back to owner"
      />
      <PartyForm
        type="VEHICLE_OWNER"
        mode="edit"
        initialData={{
          id: owner.id,
          name: owner.name,
          phone: owner.phone ?? "",
          altPhone: owner.altPhone ?? "",
          email: owner.email ?? "",
          address: owner.address ?? "",
          city: owner.city ?? "",
          state: owner.state ?? "",
          pincode: owner.pincode ?? "",
          pan: owner.pan ?? "",
          notes: owner.notes ?? "",
          isActive: owner.isActive,
        }}
      />
    </div>
  )
}
