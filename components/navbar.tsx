import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ModeToggle } from "./mode-toggle";
import Logo from "./logo";
import DynamicImg from "./dynimg";

export const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="sticky top-0 z-50 w-full px-4 sm:px-8 h-16 border-b bg-background/80 backdrop-blur-xl flex items-center justify-between transition-all">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="font-semibold fill-primary text-primary hover:opacity-80 transition-opacity">
          <Logo className="h-5" />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/home"
            className="text-muted-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link
            href="/explore"
            className="text-muted-foreground hover:text-primary transition-colors">
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
            Create Event
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ModeToggle />
        {session?.user && (
          <Link
            href="/settings"
            className="hover:ring-2 ring-primary/20 rounded-full transition-all p-0.5">
            <DynamicImg
              src={session.user.image!}
              className="h-8 w-8 rounded-full border shadow-sm"
            />
          </Link>
        )}
      </div>
    </nav>
  );
};
