import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccountView } from "@neondatabase/auth/react/ui";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account · Intrack" };

/**
 * The profile menu links here (/account/settings), so without this route it
 * 404s. Covers settings, security, and the rest of accountViewPaths.
 */
export default async function AccountPage({ params }: PageProps<"/account/[path]">) {
  const { path } = await params;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      {/* AccountView renders no header, so this is the only way back. */}
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/">
          <ArrowLeft className="size-4" /> Back to applications
        </Link>
      </Button>

      <AccountView path={path} />
    </main>
  );
}
