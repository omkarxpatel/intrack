import Link from "next/link";
import { UserButton } from "@neondatabase/auth/react/ui";
import { ChartNoAxesColumn, Upload } from "lucide-react";
import { getStatusPaths, listApplications, listRolePresets } from "@/lib/queries";
import {
  APPLICATION_STATUSES,
  TERMS,
  type ApplicationStatus,
  type Term,
} from "@/lib/constants";
import { ApplicationsView } from "@/components/applications-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

function parseStatus(value: string | undefined): ApplicationStatus | undefined {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : undefined;
}

function parseTerm(value: string | undefined): Term | undefined {
  return TERMS.includes(value as Term) ? (value as Term) : undefined;
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

  const [applications, rolePresets, statusPaths] = await Promise.all([
    listApplications({
      status: parseStatus(first("status")),
      term: parseTerm(first("term")),
      sort: parseSort(first("sort")),
    }),
    listRolePresets(),
    getStatusPaths(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Intrack</h1>
          <p className="text-sm text-muted-foreground">Internship application tracker</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/insights">
              <ChartNoAxesColumn className="size-4" /> Insights
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/import">
              <Upload className="size-4" /> Import
            </Link>
          </Button>
          <UserButton />
        </div>
      </header>

      <ApplicationsView
        applications={applications}
        rolePresets={rolePresets}
        statusPaths={statusPaths}
      />
    </main>
  );
}
