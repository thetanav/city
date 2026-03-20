import { CloudAlert, Loader, MegaphoneOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Loading() {
  return (
    <div className="flex min-h-[42vh] w-full items-center justify-center">
      <Loader className="size-5 text-muted-foreground animate-spin" />
    </div>
  );
}

export function Error() {
  return (
    <Card>
      <CardContent className="flex min-h-[42vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <CloudAlert className="size-8" />
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Something broke</p>
          <p className="text-sm">Try refreshing this view.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Empty() {
  return (
    <Card>
      <CardContent className="flex min-h-[42vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <MegaphoneOff className="size-8" />
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">Nothing here yet</p>
          <p className="text-sm">The page returned an empty state.</p>
        </div>
      </CardContent>
    </Card>
  );
}
