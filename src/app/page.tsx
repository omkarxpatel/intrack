import Link from "next/link";
import { Upload } from "lucide-react";
import { listApplications, listTerms } from "@/lib/queries";
import { APPLICATION_STATUSES, CLOSED_STATUSES, type ApplicationStatus } from "@/lib/constants";
import { ApplicationsTable } from "@/components/applications-table";
import { ApplicationsToolbar } from "@/components/applications-toolbar";
import { Button } from "@/components/ui/button";

function parseStatus(value: string | undefined): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : undefined;
}

function parseSort(value: string | undefined) {
  return value === "applied" || value === "company" || value === "updated" ? value : undefined;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const first = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const [applications, terms] = await Promise.all([
    listApplications({
      status: parseStatus(first("status")),
      term: first("term"),
      q: first("q"),
      sort: parseSort(first("sort")),
    }),
    listTerms(),
  ]);

  const active = applications.filter((a) => !CLOSED_STATUSES.includes(a.status));
  const interviewing = applications.filter(
    (a) => a.status === "interview" || a.status === "online_assessment",
  );
  const offers = applications.filter((a) => a.status === "offer");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intrack</h1>
          <p className="text-sm text-muted-foreground">Internship application tracker</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/import">
            <Upload className="size-4" /> Import
          </Link>
        </Button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={applications.length} />
        <Stat label="Active" value={active.length} />
        <Stat label="In process" value={interviewing.length} />
        <Stat label="Offers" value={offers.length} />
      </div>

      <div className="mb-4">
        <ApplicationsToolbar terms={terms} />
      </div>

      <ApplicationsTable applications={applications} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
