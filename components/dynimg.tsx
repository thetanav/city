"use client";
import { Loader } from "lucide-react";
import { useState } from "react";

export default function DynamicImg({
  className,
  classImg,
  src,
}: {
  className?: string;
  classImg?: string;
  src: string;
}) {
  const [isLoading, setLoading] = useState(true);
  return (
    <div
      className={`overflow-hidden flex items-center justify-center select-none ${className} relative`}
    >
      <Loader
        className={`size-4 opacity-60 animate-spin absolute top-1/2 left-1/2 -translate-1/2 z-0 ${!isLoading && "opacity-0"}`}
      />
      <img
        src={src}
        className={`object-cover w-full h-full z-10 ${classImg}`}
        onLoad={() => setLoading(false)}
        draggable={false}
      />
    </div>
  );
}
