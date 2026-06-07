---
paths:
  - prisma/**
  - src/lib/db.ts
  - src/generated/**
---

# Prisma

## Generated client location

The Prisma client is generated to `src/generated/prisma/` — **not** the default `node_modules/.prisma`. This is set in `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

The folder is gitignored and rebuilt on every `pnpm install` (via `postinstall` script). Always import from these paths:

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import type { User, Topic, Item } from "@/generated/prisma/models";
```

Never import from `@prisma/client` directly.

## Singleton (`src/lib/db.ts`)

Uses `PrismaPg` adapter (pg driver, not the default query engine). The instance is cached on `globalThis` during development to survive hot-reload. In Server Components and actions, always use the exported `prisma` singleton:

```typescript
import { prisma } from "@/lib/db";
```

## Schema summary

| Model | Key fields | Notes |
|---|---|---|
| `User` | `id` (CUID), `email` (unique), `displayName` (unique), `passwordHash`, `avatarPath?`, `locale`, `role` | `role` defaults to `USER`; seed creates one `ADMIN` |
| `Topic` | `id`, `ownerId`, `title`, `titleColor` (#hex), `emoji`, `archived` | Owner is not in `TopicMember`; membership is checked as `ownerId OR memberId` |
| `TopicMember` | composite PK `(topicId, userId)` | Junction table; no extra fields |
| `Item` | `id`, `topicId`, `creatorId`, `title`, `description`, `imagePath?` | Markdown stored raw; rendered client-side |
| `Score` | composite PK `(itemId, userId)`, `stars` (0–5), `crown`, `poop` | One row per (item, user) pair; upserted on every score change |
| `Comment` | `id`, `itemId`, `authorId`, `body`, `createdAt`, `updatedAt` | Edit-only; no delete at any level |

All relationships cascade on delete (e.g., deleting a Topic removes its Items, Scores, Comments).

## Workflow for schema changes

1. Edit `prisma/schema.prisma`
2. `pnpm db:push` (dev, no migration file) **or** `pnpm db:migrate` (creates a named migration)
3. `pnpm db:generate` — regenerates `src/generated/prisma/`

In Docker, `prisma db push` runs automatically on container start (entrypoint script). Use `db:migrate` for production-safe incremental changes.

## Seed (`prisma/seed.mjs`)

Idempotent: creates the admin user only if `ADMIN_EMAIL` does not already exist. Reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` from env. Bcrypt rounds: 12. Run manually with `pnpm db:seed` or it runs automatically on container start.

## Datasource

No `url` field in `schema.prisma` — the connection string is passed entirely through the `PrismaPg` adapter in `db.ts` using `process.env.DATABASE_URL`. The password in `DATABASE_URL` must not contain `%` characters (URL percent-encoding conflict).
