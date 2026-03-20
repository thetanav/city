"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/eden";
import { useMutation } from "@tanstack/react-query";

export default function Page() {
  const { mutate } = useMutation({
    mutationFn: async () => {
      await api.health.get();
    },
  });
  return <Button onClick={() => mutate()}>GOOOO!!!</Button>;
}
