import Link from "next/link";
import { Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function MyEventsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
        <p className="text-muted-foreground">
          Manage the events you have created.
        </p>
      </section>

      <section className="space-y-4">
        <Link href="/dashboard">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center py-10">
              <div className="text-center space-y-2">
                <Plus className="mx-auto size-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Manage your events in Dashboard
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
