import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default function NewCompanyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Company"
        subtitle="Add a new client company"
        backHref="/parties/companies"
        backLabel="Back to Companies"
      />
      <PartyForm type="COMPANY" mode="create" />
    </div>
  )
}
