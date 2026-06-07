# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                  # hot-reload dev server
pnpm build                # production build
pnpm type-check           # tsc --noEmit (no emitting, just type validation)
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint with auto-fix
pnpm format               # Prettier over the whole project

# Tests
pnpm test                 # Vitest (unit + component), single run
pnpm test:watch           # Vitest in watch mode (TDD loop)
pnpm test:coverage        # coverage report
pnpm test:e2e             # Playwright end-to-end
pnpm test:e2e:ui          # Playwright with interactive UI

# Run a single test file
pnpm test src/test/unit/scoring.test.ts

# Database
pnpm db:push              # push schema to DB without migration file (dev)
pnpm db:migrate           # create and apply a migration (production-safe)
pnpm db:generate          # regenerate Prisma client after schema changes
pnpm db:seed              # run prisma/seed.mjs manually
pnpm db:studio            # Prisma Studio GUI

# Docker (full stack)
docker compose up -d --build   # build and start (after code changes)
docker compose up -d           # start without rebuild (fast, normal restarts)
docker compose down -v         # full reset — deletes all data and uploads
docker logs -f fourzitou-app   # live app logs
```

After any `prisma/schema.prisma` change: run `pnpm db:generate` (or the `postinstall` hook does it automatically after `pnpm install`).

## Architecture

### Route groups

```
src/app/
  (auth)/          # login, signup — no session required, no AppNav
  (app)/           # all authenticated pages, wrapped by AppLayout
    topics/
      [topicId]/
    settings/      # hub page; redirects / to /settings/profile
      profile/
      security/
      stats/
      admin/       # ADMIN role only
    profile/       # redirects to /settings/profile
    stats/         # redirects to /settings/stats
    admin/users/   # redirects to /settings/admin
  api/
    auth/[...nextauth]/
    uploads/[...path]/   # authenticated image streaming from UPLOAD_DIR
```

`(app)/layout.tsx` is the authenticated shell: it checks the session, redirects to `/login` if missing, fetches `avatarPath` from DB, and renders `AppNav`.

`(app)/settings/layout.tsx` wraps all settings pages with a left sidebar (`SettingsSidebar`).

### Auth split — critical for Edge Runtime

Auth.js is split across two files:
- **`src/auth.config.ts`** — DB-free, Edge-safe. Used by middleware. JWT strategy; stores `id`, `role`, `locale` in the token.
- **`src/auth.ts`** — Node.js only. Imports Prisma + bcryptjs; provides the Credentials provider. Used in Server Components and Server Actions.

Middleware (`src/middleware.ts`) uses `auth.config.ts` exclusively so Prisma never loads in the Edge Runtime.

### i18n

`next-intl` with `localePrefix: "never"` — no locale segment in URLs. Locale is resolved server-side in `src/i18n/request.ts` by reading the user's `locale` field from the DB on every request (not from the JWT, to ensure the UI updates immediately when the user changes it). Calling `router.refresh()` after a profile save triggers a new SSR cycle that picks up the DB change.

Message files: `messages/en.json` and `messages/fr.json`. Keys are namespaced (`topics.xxx`, `items.xxx`, `settings.xxx`, etc.).

### Server Actions pattern

All mutations live in `src/server/actions/`. Every action:
1. Calls `requireAuth()` (throws if no session)
2. Checks permissions via `src/lib/permissions.ts`
3. Validates input against a Zod schema from `src/lib/schemas.ts`
4. Persists via `prisma` (singleton from `src/lib/db.ts`)
5. Calls `revalidatePath(...)` to bust the Next.js cache

Return type is `ActionResult` (from `src/server/actions/auth.ts`): `{ success: true, data: T } | { success: false, error: string }`.

### Prisma client location

The generated client lives at `src/generated/prisma/` (not the default `node_modules/.prisma`). Import from `@/generated/prisma/client` for the client class and `@/generated/prisma/enums` for enum types. The singleton instance is exported from `src/lib/db.ts`.

### Image uploads

Uploaded files land in `UPLOAD_DIR` (env var, default `/app/uploads` in Docker). The directory is a named Docker volume (`fourzitou_uploads`). Images are served via `GET /api/uploads/[...path]` — that route checks the session before streaming, so uploads are never publicly accessible. Path traversal is explicitly guarded.

### Suggestion box

`FloatingSuggestionButton` (in `src/components/suggestions/`) is rendered by `(app)/layout.tsx` and appears on every authenticated page as a fixed bottom-left button. The form modal is always mounted (never conditionally rendered) so the draft survives when the user closes without cancelling. Cancelling explicitly resets all form fields.

Three submission types: **BUG** (red), **IDEA** (amber), **OTHER** (blue). Bug reports require an image — validated both client-side and in `createSuggestionAction`. Images support file picker, drag-and-drop, and clipboard paste.

The admin view lives at `/settings/admin` below the user table: sortable columns (type / user / date), per-column visibility toggles, UP/DOWN thumb reactions (mutually exclusive), soft-delete toggle, and a double-click detail modal. Default ordering: thumbed-up first, thumbed-down last, then by date.

### Scoring

`src/lib/scoring.ts` is a pure module (no DB, no side effects) — easy to unit-test:
- `aggregateScores(scores)` → `{ averageStars, crownCount, poopCount, voterCount }`
- `getCrownItemIdForUser(scores, userId)` → finds which item a user has crowned
- Crown uniqueness (one crown per user per topic) is enforced at the action layer, not the DB layer (no partial unique index currently)

Item sort order in `TopicDetailView`: crown-only items first (rank 2), poop-only last (rank 0), everything else in the middle (rank 1), then by `averageStars` descending within each rank.

### Permissions

`src/lib/permissions.ts` is a pure module of small predicate functions (`canViewTopic`, `canEditItem`, etc.). Admins bypass all ownership checks. Pass `{ id, role }` from the session user and a minimal object with only the fields needed for the check.

### Password strength

`src/lib/password.ts` defines 3 required criteria (min 6 chars, uppercase, lowercase) and 3 bonus criteria (min 12 chars, number, special char). The `getPasswordStrength` function returns `{ strength, score, criteria }` where `criteria` is a boolean map used to render a live checklist in `PasswordChangeForm`.

## Environment variables

See `.env.example` for all variables. Key points:
- `DATABASE_URL` password must not contain `%` (URL percent-encoding conflicts with connection string parsing).
- `POSTGRES_PASSWORD` must match the password in `DATABASE_URL`.
- `AUTH_TRUST_HOST=true` is required when running behind Docker or a reverse proxy.
- `UPLOAD_DIR` is the path inside the container; it should match the volume mount target in `docker-compose.yml`.

## Docker / deployment

Two named volumes: `fourzitou_pgdata` (PostgreSQL data) and `fourzitou_uploads` (user images). Both survive `docker compose down`; only `docker compose down -v` removes them.

On every container start, the entrypoint runs `prisma db push` (idempotent schema sync) then `node prisma/seed.mjs`. The seed skips immediately if any users exist in the database, so it only inserts the admin account on a completely fresh DB.

Portainer GitOps: webhook-triggered redeployment with "Force redeployment" enabled. Env vars are managed in Portainer's stack environment (not committed to the repo).
