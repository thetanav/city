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

  return <main className="max-w-5xl mx-auto px-4">{children}</main>;
}
