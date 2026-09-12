import PageHeader from '../components/common/PageHeader.jsx'
import ReportForm from '../components/reports/ReportForm.jsx'

export default function ReportLost() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Students"
        title="Report a lost item"
        description="Tell us what went missing and where you last had it. We'll start looking for a match right away."
      />
      <ReportForm type="lost" />
    </div>
  )
}
