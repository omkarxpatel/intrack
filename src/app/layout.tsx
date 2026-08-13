import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intrack",
  description: "Internship application tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // signInUrl/signUpUrl keep Clerk pointed at the pages in this app rather
    // than its hosted account portal, in every environment, with no extra env
    // vars to keep in sync between local and production.
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            {/* main carries flex-1, so this stays pinned to the bottom on short pages. */}
            <footer className="border-t py-4 text-center text-xs text-muted-foreground">
              Found a bug or want a feature? DM{" "}
              <span className="font-medium text-foreground">@anomier</span> on Discord.
            </footer>
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
