import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePage from "@/components/home-page";
import SignIn from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <section className="container px-4 md:px-6 py-24 md:py-32 flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Next Generation Events
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Build the future of events.
            </h1>
            <p className="mx-auto max-w-[500px] text-muted-foreground">
              A platform for creators. Performance, design, and scalability.
            </p>
          </div>

          <div className="flex gap-3">
            <Button>Get Started</Button>
            <Link href="/explore">
              <Button variant="outline">Explore</Button>
            </Link>
          </div>

          <div className="w-full max-w-sm pt-8">
            <SignIn />
          </div>
        </section>
      </div>
    );
  }

  return <HomePage user={session.user} />;
}
