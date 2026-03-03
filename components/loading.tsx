import { LoaderPinwheel } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <LoaderPinwheel className="size-5 text-muted-foreground animate-spin" />
    </div>
  );
}
