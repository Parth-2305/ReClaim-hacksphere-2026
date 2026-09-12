import PageHeader from '../components/PageHeader.jsx'
import ReportForm from '../components/ReportForm.jsx'

export default function ReportFound() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Finders & desks"
        title="Report a found item"
        description="Log something left behind on campus. Staff can review it later against open lost reports."
      />
      <ReportForm type="found" />
    </div>
  )
}
