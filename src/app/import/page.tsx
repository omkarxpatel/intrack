import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { Importer } from "@/components/importer";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Import — Intrack" };

export default async function ImportPage() {
  // This page fetches nothing, so it's the one route where no data access would
  // otherwise reach the auth gate. Call it directly so the importer UI isn't
  // served to a signed-out visitor.
  await getCurrentUserId();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/">
          <ArrowLeft className="size-4" /> Back to applications
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">Import applications</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Paste a CSV, TSV, or JSON array — or upload a file. You&apos;ll map the columns and see a
        full preview before anything is saved.
      </p>

      <Importer />
    </main>
  );
}
