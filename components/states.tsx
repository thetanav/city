import { CloudAlert, Loader, MegaphoneOff } from "lucide-react";

export function Loading() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <Loader className="size-5 text-muted-foreground animate-spin" />
    </div>
  );
}

export function Error() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center text-muted-foreground">
      <CloudAlert className="size-8" />
      <p className="font-semibold text-lg pl-4">Error</p>
    </div>
  );
}

export function Empty() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center text-muted-foreground">
      <MegaphoneOff className="size-8" />
      <p className="font-semibold text-lg pl-4">Not found</p>
    </div>
  );
}
