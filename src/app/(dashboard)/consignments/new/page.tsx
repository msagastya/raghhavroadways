import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import ConsignmentForm from "@/components/consignments/ConsignmentForm"

export const dynamic = "force-dynamic"

export default async function NewConsignmentPage() {
  const [companies, allParties, agents, vehicles] = await Promise.all([
    prisma.party.findMany({
      where: { type: "COMPANY", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: { type: "AGENT", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where:   { isActive: true, status: "AVAILABLE" },
      include: { owner: { select: { name: true } } },
      orderBy: { vehicleNumber: "asc" },
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="New Consignment"
        subtitle="Book a new consignment and generate GR"
        backHref="/consignments"
        backLabel="Back to Consignments"
      />
      <ConsignmentForm
        companies={companies}
        allParties={allParties}
        agents={agents}
        vehicles={vehicles}
      />
    </div>
  )
}
