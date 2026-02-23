import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default function NewBillingPartyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Billing Party"
        subtitle="Add a new party to bill invoices to"
        backHref="/parties/billing-parties"
        backLabel="Back to Billing Parties"
      />
      <PartyForm type="BILLING_PARTY" mode="create" />
    </div>
  )
}
