import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const company = await prisma.party.findUnique({ where: { id, type: "COMPANY" } })
  if (!company) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={`Edit: ${company.name}`}
        subtitle="Update company details"
        backHref={`/parties/companies/${id}`}
        backLabel="Back to company"
      />
      <PartyForm
        type="COMPANY"
        mode="edit"
        initialData={{
          id: company.id,
          name: company.name,
          phone: company.phone ?? "",
          altPhone: company.altPhone ?? "",
          email: company.email ?? "",
          address: company.address ?? "",
          city: company.city ?? "",
          state: company.state ?? "",
          pincode: company.pincode ?? "",
          gstin: company.gstin ?? "",
          pan: company.pan ?? "",
          creditDays: company.creditDays,
          creditLimit: company.creditLimit,
          notes: company.notes ?? "",
          isActive: company.isActive,
        }}
      />
    </div>
  )
}
