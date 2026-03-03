"use client";
import { Loader } from "lucide-react";
import { useState } from "react";

export default function DynamicImg({
  className,
  src,
}: {
  className?: string;
  src: string;
}) {
  const [isLoading, setLoading] = useState(true);
  return (
    <div
      className={`overflow-hidden flex items-center justify-center ${className}`}>
      {isLoading && <Loader className="size-4 opacity-60 animate-spin" />}
      <img
        src={src}
        className="object-cover w-full h-full"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
