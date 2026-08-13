import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AccountSettingsCards,
  ChangePasswordCard,
  SessionsCard,
} from "@neondatabase/auth/react/ui";
import { listSignInMethods } from "@/lib/queries";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { ProvidersCard } from "@/components/providers-card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings · Intrack" };

// The session lives in cookies, which only exist at request time.
export const dynamic = "force-dynamic";

/**
 * One page rather than the library's Account/Security tabs — there are only a
 * handful of cards, so splitting them across two views hid half of them behind
 * a click for no benefit.
 */
export default async function SettingsPage() {
  // Doubles as the auth gate: it calls getCurrentUserId().
  const methods = await listSignInMethods();
  const google = methods.find((m) => m.providerId === "google");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/applications">
          <ArrowLeft className="size-4" /> Back to applications
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Your account, how you sign in, and where you&apos;re signed in.
      </p>

      {/* The security cards are listed individually rather than via
          SecuritySettingsCards so the library's duplicating ProvidersCard can be
          swapped for ours. */}
      <div className="flex flex-col gap-4">
        <AccountSettingsCards />
        <ChangePasswordCard />
        <ProvidersCard
          googleAccountId={google?.accountId}
          isOnlyMethod={google !== undefined && methods.length === 1}
        />
        <SessionsCard />
        <DeleteAccountCard />
      </div>
    </main>
  );
}
