"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GoogleIcon } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/neon-auth-client";
import { Button } from "@/components/ui/button";

/**
 * Replaces the library's ProvidersCard, which lists every configured provider
 * *and* every linked one without deduplicating — so a linked Google account
 * showed up twice, once to unlink and once to link again.
 *
 * It also refuses to unlink the last sign-in method: anyone who signed up with
 * Google has no password, and unlinking would lock them out of their own
 * applications with no way back in.
 */
export function ProvidersCard({
  googleAccountId,
  isOnlyMethod,
}: {
  googleAccountId?: string;
  isOnlyMethod: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function link() {
    setBusy(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/account/settings",
    });
    // Success navigates away to Google, so there's nothing to reset.
    if (error) {
      toast.error(error.message ?? "Couldn't connect Google");
      setBusy(false);
    }
  }

  async function unlink() {
    if (!googleAccountId) return;
    setBusy(true);
    const { error } = await authClient.unlinkAccount({
      providerId: "google",
      accountId: googleAccountId,
    });
    if (error) toast.error(error.message ?? "Couldn't disconnect Google");
    else {
      toast.success("Google disconnected");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="rounded-lg border">
      <div className="p-6">
        <h3 className="font-semibold">Sign-in methods</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">How you get into your account.</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm">
            <GoogleIcon className="size-4" />
            Google
          </span>

          {googleAccountId ? (
            <Button variant="outline" onClick={unlink} disabled={busy || isOnlyMethod}>
              Unlink
            </Button>
          ) : (
            <Button onClick={link} disabled={busy}>
              Link
            </Button>
          )}
        </div>

        {isOnlyMethod && (
          <p className="mt-2 text-xs text-muted-foreground">
            Google is your only way to sign in. Set a password above before disconnecting it.
          </p>
        )}
      </div>
    </div>
  );
}
