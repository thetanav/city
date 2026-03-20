/* eslint-disable @next/next/no-img-element */
"use client";

import { Loader } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export default function DynamicImg({
  alt = "",
  className,
  classImg,
  src,
}: {
  alt?: string;
  className?: string;
  classImg?: string;
  src: string;
}) {
  const [isLoading, setLoading] = useState(true);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden select-none",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-muted/25 transition-opacity",
          !isLoading && "opacity-0",
        )}
      >
        <Loader className="size-4 animate-spin opacity-60" />
      </div>
      <img
        alt={alt}
        decoding="async"
        draggable={false}
        loading="eager"
        onError={() => setLoading(false)}
        onLoad={() => setLoading(false)}
        src={src}
        className={cn(
          "z-10 h-full w-full object-cover transition duration-700",
          isLoading && "scale-[1.03] opacity-0",
          !isLoading && "opacity-100",
          classImg,
        )}
      />
    </div>
  );
}
