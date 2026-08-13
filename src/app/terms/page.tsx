import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Terms of Service · Intrack" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">Last updated August 13, 2026</p>

      <div className="space-y-8 text-sm leading-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:text-muted-foreground [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <p>
            By using Intrack you agree to these terms. If you do not agree with them, please do
            not use the site.
          </p>
        </section>

        <section>
          <h2>What Intrack is</h2>
          <p>
            A free tool for tracking your own internship applications. It is an independent
            project and is not affiliated with, endorsed by, or connected to any employer,
            university, or job board. It does not guarantee interviews, offers, or an accurate
            picture of any employer&apos;s hiring process.
          </p>
        </section>

        <section>
          <h2>Your account</h2>
          <p>
            Give accurate information when you register, one account per person, and keep your
            sign-in details to yourself — you are responsible for activity under your account.
            Tell us if you believe it has been compromised.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>Do not:</p>
          <ul>
            <li>
              attempt to access another user&apos;s data, or any part of the system you were not
              given access to
            </li>
            <li>scrape, overload, probe, or attack the service</li>
            <li>
              upload malicious content, or use Intrack to break the law or infringe anyone&apos;s
              rights
            </li>
            <li>resell it or pass it off as your own service</li>
          </ul>
        </section>

        <section>
          <h2>Your content</h2>
          <p>
            The applications, notes, and files you put into Intrack remain yours. You give us
            permission to store, process, and display that content solely to run the service for
            you. You are responsible for having the right to enter what you enter.
          </p>
        </section>

        <section>
          <h2>Availability</h2>
          <p>
            Intrack is a side project maintained by one person. Features may change, and the
            service may be unavailable, interrupted, or discontinued at any time, with or without
            notice. Keep your own copy of anything you cannot afford to lose — the app imports
            and reads CSV, TSV, and JSON.
          </p>
        </section>

        <section>
          <h2>Ending it</h2>
          <p>
            Stop using Intrack whenever you like, and delete your account from Settings when you
            do. We may suspend or remove accounts that break these terms or put the service at
            risk.
          </p>
        </section>

        <section>
          <h2>No warranty</h2>
          <p>
            Intrack is provided &quot;as is&quot; and &quot;as available&quot;, without
            warranties of any kind, express or implied, including merchantability, fitness for a
            particular purpose, and non-infringement.
          </p>
        </section>

        <section>
          <h2>Limits on liability</h2>
          <p>
            To the fullest extent the law allows, we are not liable for indirect, incidental, or
            consequential damages, or for lost data, lost opportunities, or lost profits arising
            from your use of Intrack. Our total liability to you is limited to the amount you
            have paid to use it.
          </p>
        </section>

        <section>
          <h2>Changes to these terms</h2>
          <p>
            We may update these terms; the date at the top changes when we do. Continuing to use
            Intrack after an update means you accept it.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about these terms: DM{" "}
            <span className="font-medium text-foreground">@anomier</span> on Discord.
          </p>
        </section>
      </div>
    </main>
  );
}
