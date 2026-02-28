# AGENTS.md

This repository is a Next.js 16 (App Router) + TypeScript codebase with
Elysia API routes and Prisma. Use these notes to work consistently.

## Build, lint, test

- Install deps: `bun install` (or npm/yarn/pnpm)
- Dev server: `bun dev` (Next.js dev)
- Production build: `bun run build`
- Start prod server: `bun run start`
- Lint: `bun run lint`

### Tests

- There is no test runner configured in `package.json` yet.
- If you add tests, also add a corresponding `test` script and update this file.
- Single test: not applicable until a test runner is added.

### Prisma

- Generate client: `bun run generate`
- Create/apply migrations (dev): `bun run migrate`

## Project structure

- `app/`: Next.js App Router pages, layouts, route handlers
- `components/`: UI and feature components
- `components/ui/`: shadcn-style primitives
- `lib/`: shared utilities (auth, prisma, utils)
- `server/api/`: Elysia API modules
- `prisma/`: schema and migrations

## Code style and conventions

### Formatting

- ESLint is enabled via `eslint.config.mjs` (Next core-web-vitals + TS rules).
- No Prettier config is present. Match existing file style.
- Most source uses double quotes and semicolons; some `components/ui/*`
  follow shadcn formatting (no semicolons). Keep the local file style.
- Prefer one JSX prop per line when it improves readability.

### Imports

- Use path alias `@/*` (see `tsconfig.json` paths).
- Order: external libs, then internal `@/` imports, then relative imports.
- Use `type` imports for types: `import type { Foo } from "..."`.

### TypeScript

- `strict: true` is enabled. Avoid `any` and `as` unless necessary.
- Prefer explicit types at public boundaries (props, API handlers, helpers).
- Favor `type` over `interface` unless extending or merging is required.
- Use `readonly` / `as const` for immutable structures when helpful.

### React / Next.js

- Use App Router patterns (`app/` routes and layouts).
- Mark client components with "use client" at top of file.
- Prefer server components by default; move to client only when needed.
- Use Next.js `Metadata` in `app/layout.tsx` for page metadata.
- Images: prefer `next/image` unless a specific case requires `<img>`.

### Components

- UI primitives live under `components/ui` and follow shadcn conventions.
- Use `class-variance-authority` and `cn` from `lib/utils` for variants.
- Keep components small; split large feature UIs into subcomponents.
- Use `data-slot` attributes in primitives when pattern already exists.

### Styling

- Tailwind CSS is used; keep class lists readable and grouped logically.
- Prefer `cn()` to conditionally merge Tailwind classes.
- Avoid introducing new global CSS unless necessary.

### Naming

- Components: PascalCase file names and exports.
- Hooks: `useX` naming and declared in client components.
- Routes: match Next.js folder/file naming (lowercase, kebab/segment style).
- API modules: `eventsRoutes`, `healthRoutes`, etc.

### API (Elysia)

- API lives in `server/api`, grouped by module.
- Prefer `t.Object` for params and body validation.
- Use explicit status codes on errors and return a JSON object.
- Keep route handlers small; extract logic if it grows.

### Auth

- `lib/auth.ts` uses Better Auth with Google provider and Prisma adapter.
- Do not hardcode secrets. Use `process.env` variables.
- Expect required env vars to exist (non-null assertions used).

### Database (Prisma)

- Prisma client is created in `lib/prisma.ts` using the PG adapter.
- Use `prisma` from `lib/prisma` for DB access; avoid new clients.

### Error handling

- Prefer early returns with explicit status codes in API routes.
- In UI, validate user input before submission and show inline feedback.
- Log errors only when it helps diagnosis; avoid noisy `console.log`.

## Lint rules worth noting

- Next.js lint rules are enabled (core-web-vitals).
- `@next/next/no-img-element` exists; if you must use `<img>`,
  leave a focused ESLint disable comment near the usage.

## Environment

- `DATABASE_URL` is required for Prisma PG.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for auth.

## Cursor / Copilot rules

- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.
