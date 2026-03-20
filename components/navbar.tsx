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
              className="flex items-center gap-2 font-semibold text-foreground">
              <Logo className="h-4 fill-current" />
              <span>City</span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            {session?.user ? (
              <>
                <Button
                  className="hidden sm:inline-flex"
                  render={<Link href="/events/new" />}
                  size="sm"
                  variant="outline">
                  <Plus className="size-4" />
                  Create event
                </Button>
                <Link
                  href="/settings"
                  className="flex size-9 items-center justify-center overflow-hidden rounded-md border bg-muted text-sm font-medium">
                  {session.user.image ? (
                    <DynamicImg
                      alt={`${session.user.name ?? "Profile"} avatar`}
                      className="size-full"
                      src={session.user.image}
                    />
                  ) : (
                    profileInitial
                  )}
                </Link>
              </>
            ) : (
              <Button render={<Link href="/auth" />} size="sm">
                Sign in
              </Button>
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t py-2 sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
