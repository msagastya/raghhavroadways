import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await prisma.party.findUnique({ where: { id, type: "AGENT" } })
  if (!agent) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Edit: ${agent.name}`}
        subtitle="Update agent details"
        backHref={`/parties/agents/${id}`}
        backLabel="Back to agent"
      />
      <PartyForm
        type="AGENT"
        mode="edit"
        initialData={{
          id: agent.id,
          name: agent.name,
          phone: agent.phone ?? "",
          altPhone: agent.altPhone ?? "",
          email: agent.email ?? "",
          address: agent.address ?? "",
          city: agent.city ?? "",
          state: agent.state ?? "",
          pincode: agent.pincode ?? "",
          gstin: agent.gstin ?? "",
          pan: agent.pan ?? "",
          commissionType: agent.commissionType,
          commissionValue: agent.commissionValue,
          notes: agent.notes ?? "",
          isActive: agent.isActive,
        }}
      />
    </div>
  )
}
