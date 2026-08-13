import { AuthView } from "@neondatabase/auth/react/ui";

export const metadata = { title: "Sign in · Intrack" };

/** Sign in, sign up, forgot/reset password, sign out — all handled by AuthView. */
export default async function AuthPage({ params }: PageProps<"/auth/[path]">) {
  const { path } = await params;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthView path={path} />
    </main>
  );
}
