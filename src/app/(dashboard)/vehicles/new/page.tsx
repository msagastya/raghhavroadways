import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import VehicleForm from "@/components/vehicles/VehicleForm"

export const dynamic = "force-dynamic"

export default async function NewVehiclePage() {
  const owners = await prisma.party.findMany({
    where: { type: "VEHICLE_OWNER", isActive: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Vehicle"
        subtitle="Register a vehicle and link it to its owner"
        backHref="/vehicles"
        backLabel="Back to Vehicles"
      />
      <VehicleForm mode="create" owners={owners} />
    </div>
  )
}
