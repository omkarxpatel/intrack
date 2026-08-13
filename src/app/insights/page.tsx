import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInsights } from "@/lib/insights";
import { InsightsBoard } from "@/components/insights/insights-board";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Insights · Intrack" };

// Nothing on this page reads a request-time API, so Next would happily
// prerender it once at build time and serve those numbers forever. Insights are
// a live read of the pipeline: recompute them on every visit.
export const dynamic = "force-dynamic";

function formatRate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

export default async function InsightsPage() {
  const insights = await getInsights();
  const { applied, missingAppliedDate, totalApplications, medianDaysToResponse } = insights;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">
            {totalApplications === 0
              ? "Add or import applications to see your pipeline."
              : `Across ${totalApplications} tracked ${totalApplications === 1 ? "application" : "applications"}`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" /> Applications
          </Link>
        </Button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Applied" value={String(applied)} />
        <Stat
          label="Response rate"
          value={formatRate(insights.responseRate)}
          hint="Heard back, including rejections"
        />
        <Stat
          label="Interview rate"
          value={formatRate(insights.interviewRate)}
          hint="Reached an interview"
        />
        <Stat
          label="Offer rate"
          value={formatRate(insights.offerRate)}
          hint="Reached an offer"
        />
        <Stat
          label="Median reply"
          value={medianDaysToResponse === null ? "—" : `${medianDaysToResponse}d`}
          hint="Applied to first response"
        />
      </div>

      <InsightsBoard insights={insights} />

      {missingAppliedDate > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {missingAppliedDate} {missingAppliedDate === 1 ? "application has" : "applications have"}{" "}
          no applied date and {missingAppliedDate === 1 ? "is" : "are"} excluded from the weekly
          and activity charts.
        </p>
      )}
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
