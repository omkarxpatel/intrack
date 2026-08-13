"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/neon-auth-client";

/**
 * Deliberately the raw AuthUIProvider rather than Neon's NeonAuthUIProvider
 * wrapper: that wrapper nests a second next-themes ThemeProvider (the app
 * already has one) and wraps everything in a div, which would break the
 * body-level flex layout the footer relies on to stay at the bottom.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      // Server components hold the data, so a sign-in/out has to invalidate them.
      onSessionChange={() => router.refresh()}
      Link={Link}
      basePath="/auth"
      // Has to be a proxy-covered route, not just the nicest landing spot:
      // Neon appends the OAuth verifier to this URL and src/proxy.ts is what
      // exchanges it for a session cookie. "/" is public, so it would drop it.
      redirectTo="/applications"
      social={{ providers: ["google"] }}
      credentials={{ forgotPassword: true }}
    >
      {children}
    </AuthUIProvider>
  );
}
