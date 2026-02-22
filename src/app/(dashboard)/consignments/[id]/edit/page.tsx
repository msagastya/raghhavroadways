import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import ConsignmentEditForm from "@/components/consignments/ConsignmentEditForm"

export default async function EditConsignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [consignment, companies, allParties, agents, vehicles] = await Promise.all([
    prisma.consignment.findUnique({
      where: { id },
      include: {
        consignor: { select: { id: true, name: true } },
        consignee: { select: { id: true, name: true } },
        agent:     { select: { id: true, name: true } },
        vehicle:   { select: { id: true, vehicleNumber: true } },
      },
    }),
    prisma.party.findMany({
      where:   { type: "COMPANY", isActive: true },
      select:  { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where:   { type: "AGENT", isActive: true },
      select:  { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where:   { isActive: true, status: { in: ["AVAILABLE", "ON_TRIP"] } },
      include: { owner: { select: { name: true } } },
      orderBy: { vehicleNumber: "asc" },
    }),
  ])

  if (!consignment) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={`Edit ${consignment.lrNumber}`}
        subtitle="Update consignment details"
        backHref={`/consignments/${id}`}
        backLabel="Back to Consignment"
      />
      <ConsignmentEditForm
        consignment={consignment}
        companies={companies}
        allParties={allParties}
        agents={agents}
        vehicles={vehicles}
      />
    </div>
  )
}
