import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import VehicleForm from "@/components/vehicles/VehicleForm"

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [vehicle, owners] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id } }),
    prisma.party.findMany({
      where: { type: "VEHICLE_OWNER", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!vehicle) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Edit: ${vehicle.vehicleNumber}`}
        backHref={`/vehicles/${id}`}
        backLabel="Back to vehicle"
      />
      <VehicleForm
        mode="edit"
        owners={owners}
        initialData={{
          id:            vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          type:          vehicle.type,
          capacity:      vehicle.capacity,
          ownerId:       vehicle.ownerId,
          status:        vehicle.status,
          notes:         vehicle.notes ?? "",
        }}
      />
    </div>
  )
}
