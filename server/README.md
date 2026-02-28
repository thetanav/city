# Server APIs

This folder hosts the Elysia API modules that power `/api` routes.

## Structure

- `server/api/app.ts`: API composition entrypoint
- `server/api/modules/*`: Feature modules

## Routing

Each module mounts to `/api/<module-prefix>`.

- `health`: `/api/health`
- `events`: `/api/events`
- `organizers`: `/api/organizers`

## Server components + DB calls

Inline DB calls from server components are fine when the data is local to the page,
simple to fetch, and not reused across multiple clients. Keep them server-only and
avoid sending secrets to the client.

Prefer Elysia API routes when:

- The data is shared between pages or clients (web + mobile).
- You need a stable public contract for frontend + external usage.
- You need centralized auth, rate limits, or caching behavior.

Tip: use server actions or route handlers for writes and side effects; keep server
component reads lean and avoid large payloads.
