import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default function NewAgentPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Agent"
        subtitle="Add a new agent who brings business"
        backHref="/parties/agents"
        backLabel="Back to Agents"
      />
      <PartyForm type="AGENT" mode="create" />
    </div>
  )
}
