import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Plus } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import Logo from "./logo";
import DynamicImg from "./dynimg";
import { Button } from "./ui/button";

const guestLinks = [
  { href: "/", label: "Overview" },
  { href: "/explore", label: "Explore" },
] as const;

const memberLinks = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const navLinks = session?.user ? memberLinks : guestLinks;
  const profileInitial = session?.user?.name?.charAt(0).toUpperCase() ?? "C";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href={session?.user ? "/home" : "/"}
              className="flex items-center gap-2 font-semibold text-foreground"
            >
              <Logo className="h-4 fill-current" />
            </Link>

            <nav className="hidden items-center gap-3 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <ModeToggle />
            {session?.user ? (
              <>
                <Button className="hidden sm:inline-flex" asChild variant="outline">
                  <Link href="/events/new">
                    <Plus className="size-4" />
                    Create event
                  </Link>
                </Button>
                <Link
                  href="/settings"
                  className="flex h-full items-center justify-center overflow-hidden rounded-lg border bg-muted text-sm font-medium"
                >
                  {session.user.image ? (
                    <DynamicImg
                      alt={`${session.user.name ?? "Profile"} avatar`}
                      className="size-8"
                      src={session.user.image}
                    />
                  ) : (
                    profileInitial
                  )}
                </Link>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t py-2 sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
