"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/eden";
import { useMutation } from "@tanstack/react-query";

export default function Page() {
  const { mutate } = useMutation({
    mutationFn: async () => {
      const data = await api.health.get();
    },
  });
  return <Button onClick={() => mutate()}>GOOOO!!!</Button>;
}
