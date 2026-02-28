import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            City
          </Link>
          <nav className="hidden md:flex gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/events/new"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Create
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
