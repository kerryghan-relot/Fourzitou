---
paths:
  - src/auth.ts
  - src/auth.config.ts
  - src/middleware.ts
  - src/types/**
---

# Auth architecture

Auth.js v5 (NextAuth) with JWT strategy and a Credentials provider. The config is intentionally split across two files to support the Edge Runtime.

## Two-file split

**`src/auth.config.ts`** — Edge-safe. No Prisma, no bcrypt. Contains:
- `session: { strategy: "jwt" }`
- JWT/session callbacks that copy `id`, `role`, `locale` from the user object into the token, then from the token into the session
- Custom pages: `signIn: "/login"`, `newUser: "/signup"`
- Empty `providers: []` array (providers are added in `auth.ts`)

**`src/auth.ts`** — Node.js only. Imports Prisma + bcryptjs. Adds the Credentials provider:
1. Validates credentials with a Zod schema
2. Looks up the user by email
3. Compares the password hash with bcrypt
4. Returns `{ id, email, name (= displayName), role, locale }` on success, `null` on failure

The middleware (`src/middleware.ts`) uses `NextAuth(authConfig)` — the DB-free version — so Prisma never loads in the Edge Runtime. Never import from `src/auth.ts` in middleware.

## Session shape

After login, the JWT stores `id`, `role`, and `locale`. The session exposes these on `session.user`:

```typescript
session.user.id       // string (CUID)
session.user.role     // string ("USER" | "ADMIN") — cast to Role enum when calling permissions
session.user.locale   // string ("en" | "fr") — kept for reference; UI reads locale from DB directly
```

The locale in the JWT is **not** used for i18n resolution. It was intentionally removed from that path to avoid stale-cache issues when the user changes their locale. `src/i18n/request.ts` reads locale from the DB on every request.

## Middleware

`src/middleware.ts` protects all routes except `/login`, `/signup`, `/api/auth`, and static assets. On unauthenticated access it redirects to `/login?callbackUrl=<original-path>`. Images (`/api/uploads/*`) are excluded from the matcher so the upload route handler can do its own auth check.

## How to call `auth()` in server code

```typescript
import { auth } from "@/auth";      // Node.js context (Server Components, actions)
const session = await auth();
if (!session?.user?.id) redirect("/login");
```

Never call `auth()` from middleware — it uses its own `auth` derived from `authConfig`.

## Types

`src/types/next-auth.d.ts` extends the NextAuth module to add `id`, `role`, and `locale` to the `User` and `Session.user` types, eliminating the need for casting in most places.
