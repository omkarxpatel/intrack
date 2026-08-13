import Link from "next/link";
import { ArrowRight, ChartNoAxesColumn, Table2, Upload } from "lucide-react";
import { neonAuth } from "@/lib/neon-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

// The one page src/proxy.ts leaves public, so it has to render for signed-out
// visitors. Reading the session to pick the call to action is a cookie read,
// which rules out prerendering.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Table2,
    title: "Track",
    body: "Every application in one table — status, dates, links, notes. Filter and search as you type.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Measure",
    body: "Response, interview, and offer rates off your own pipeline, not somebody else's averages.",
  },
  {
    icon: Upload,
    title: "Import",
    body: "Bring a CSV, TSV, or JSON export. Map the columns, preview every row, then save.",
  },
];

export default async function Home() {
  const { data: session } = await neonAuth.getSession();
  const signedIn = Boolean(session?.user);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">Intrack</span>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col justify-center py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Every internship application, in one place.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          The tracker for the spreadsheet you keep rewriting — statuses, dates, and notes for
          everything you&apos;ve applied to, plus the numbers that show what&apos;s working.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link href={signedIn ? "/applications" : "/auth/sign-up"}>
              {signedIn ? "Open your tracker" : "Get started"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {!signedIn && (
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          )}
        </div>

        {/* gap-px over the border color: hairline dividers, same as the table. */}
        <div className="mt-16 grid gap-px border bg-border sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background p-4">
              <Icon className="size-4" />
              <h2 className="mt-3 text-sm font-medium">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
