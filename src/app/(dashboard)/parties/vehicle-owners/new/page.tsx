import PageHeader from "@/components/ui/PageHeader"
import PartyForm from "@/components/parties/PartyForm"

export default function NewVehicleOwnerPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add Vehicle Owner"
        subtitle="Add a truck owner whose vehicles you use"
        backHref="/parties/vehicle-owners"
        backLabel="Back to Vehicle Owners"
      />
      <PartyForm type="VEHICLE_OWNER" mode="create" />
    </div>
  )
}
