import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="sticky top-0 z-50 w-full px-8 h-16 border-b bg-background flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          <Image
            src="/city.svg"
            alt="CITY events"
            width={45}
            height={45}
            className="h-6"
          />
        </Link>
        <nav className="hidden md:flex gap-4 text-sm">
          <Link
            href="/explore"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Explore
          </Link>
          <Link
            href="/events/new"
            className="text-muted-foreground hover:text-foreground transition-colors">
            Create
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/settings">
          <button className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden cursor-pointer">
            <img
              src={session?.user.image!}
              alt={session?.user.name || "User"}
            />
          </button>
        </Link>
      </div>
    </nav>
  );
};
