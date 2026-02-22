import { prisma } from "@/lib/prisma"
import PageHeader from "@/components/ui/PageHeader"
import BillForm from "@/components/billing/BillForm"

export const dynamic = "force-dynamic"

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ consignmentId?: string }>
}) {
  const { consignmentId } = await searchParams

  // Fetch consignment data if pre-linking
  const consignment = consignmentId
    ? await prisma.consignment.findUnique({
        where:   { id: consignmentId },
        include: {
          consignor: { select: { id: true, name: true, gstin: true, state: true } },
          consignee: { select: { id: true, name: true, state: true } },
        },
      })
    : null


  // All active companies for party select
  const companies = await prisma.party.findMany({
    where:   { type: "COMPANY", isActive: true },
    select:  { id: true, name: true, gstin: true, state: true, creditDays: true },
    orderBy: { name: "asc" },
  })

  // Unbilled delivered consignments (not already billed with a bill)
  const unbilledConsignments = await prisma.consignment.findMany({
    where: {
      status: { in: ["DELIVERED", "BILLED", "PARTIALLY_PAID"] },
      bills:  { none: { status: { not: "CANCELLED" } } },
    },
    select: {
      id: true, lrNumber: true, fromCity: true, toCity: true,
      freightAmount: true, description: true, consignor: { select: { name: true } },
    },
    orderBy: { bookingDate: "desc" },
    take: 50,
  })

  // Company state from settings (for GST interstate detection)
  const stateSetting = await prisma.systemSetting.findUnique({ where: { key: "state" } })
  const companyState = stateSetting?.value ?? "Maharashtra"

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="New Bill"
        subtitle="Generate a freight invoice"
        backHref="/billing"
        backLabel="Back to Billing"
      />
      <BillForm
        companies={companies}
        unbilledConsignments={unbilledConsignments}
        preselectedConsignment={consignment}
        companyState={companyState}
      />
    </div>
  )
}
