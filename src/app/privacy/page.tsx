import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Privacy Policy · Intrack" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">Last updated August 13, 2026</p>

      <div className="space-y-8 text-sm leading-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:text-muted-foreground [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <p>
            Intrack is a free, independent tool for tracking your own internship applications.
            This policy covers what it stores, why, and what you can do about it.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Account details.</strong> When you sign up, our authentication provider
              stores your email address and a hashed password. If you use Google sign-in, it
              stores the email address, name, and profile picture Google shares with us — we
              never see your Google password.
            </li>
            <li>
              <strong>What you enter.</strong> For each application: company, role, job link,
              work mode, term, status, applied date, salary, source, and any notes. We also keep
              a history of status changes so the app can show a timeline, plus the role names you
              save as presets. Anything you bring in through Import is stored the same way.
            </li>
            <li>
              <strong>Usage data.</strong> Vercel Web Analytics counts page views in aggregate.
              It sets no cookies, builds no profile, and does not follow you to other sites. Our
              hosting and database providers keep standard server logs (IP address, timestamp,
              request) for security and debugging.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            One cookie: the session cookie that keeps you signed in. Your light/dark preference
            is stored in your browser and never sent to us. No advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            To sign you in, store and display the applications you enter, and calculate your
            insights. That is all. We do not sell your data, run ads, build advertising profiles,
            or use your applications to train AI models.
          </p>
        </section>

        <section>
          <h2>Who else sees it</h2>
          <p>
            Nobody buys or receives your data. It passes only through the services needed to run
            Intrack:
          </p>
          <ul>
            <li>Neon — hosts the database and the authentication service</li>
            <li>Vercel — hosts the app and provides the analytics counts</li>
            <li>Google — only if you choose Google sign-in</li>
          </ul>
          <p>
            We may also disclose information if the law requires it, or to protect the service
            from abuse.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            Traffic is served over HTTPS. Passwords are hashed by the authentication provider and
            never stored in plain text. Every database query is scoped to your user id, so one
            account cannot read another account&apos;s rows. No service on the internet is
            completely secure, and we cannot promise that determined attackers will never get
            through — what we can do is collect no more than the app needs.
          </p>
        </section>

        <section>
          <h2>Keeping and deleting your data</h2>
          <p>
            Your data stays until you remove it. You can edit or delete any application at any
            time inside the app, and{" "}
            <Link href="/account/settings" className="font-medium text-foreground underline">
              Settings
            </Link>{" "}
            has a Delete account button that removes your account along with every application,
            status history, and saved role — immediately, without asking us. Database backups may
            hold copies for a short period before they rotate out.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            You can access, correct, export, or delete your data. The app covers most of this
            directly; for anything it does not, ask. Depending on where you live, you may have
            further statutory rights — we will honor them.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            Intrack is not intended for anyone under 13, and we do not knowingly collect their
            information.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            Any update appears on this page with a new date. Keep an eye on it from time to time.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy: DM{" "}
            <span className="font-medium text-foreground">@anomier</span> on Discord. You don&apos;t
            need to ask us to delete anything — Settings does it.
          </p>
        </section>
      </div>
    </main>
  );
}
