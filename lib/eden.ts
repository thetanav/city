import { treaty } from "@elysiajs/eden";
import type { app } from "@/server/api/app";

const apiBaseUrl =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
    : "";

// .api to enter /api prefix
export const api = treaty<typeof app>(apiBaseUrl).api;
