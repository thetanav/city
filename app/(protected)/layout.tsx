import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  return (
    <main className="min-h-[calc(100vh-4rem)] mx-auto w-full max-w-5xl px-4 py-10">
      {children}
    </main>
  );
}
