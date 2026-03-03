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
    <nav className="sticky top-0 z-50 w-full px-8 h-16 border-b bg-background/50 backdrop-blur-2xl flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold fill-primary text-primary">
          <Logo className="h-4" />
        </Link>
        <nav className="hidden md:flex gap-4 text-sm">
          <Link
            href="/home"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link
            href="/explore"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Create Event
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Link href="/settings">
          <DynamicImg
            src={session?.user.image!}
            className="h-7 w-7 rounded-full"
          />
        </Link>
      </div>
    </nav>
  );
};
