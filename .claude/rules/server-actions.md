---
paths:
  - src/server/actions/**
---

# Server actions

All mutations in this project go through Server Actions in `src/server/actions/`. Every action follows the same pattern — deviate only with a clear reason.

## Invariant pattern

```typescript
"use server";

export async function myAction(input: string): Promise<ActionResult> {
  // 1. Require a valid session
  const user = await requireAuth();          // throws if no session

  // 2. Authorize against permissions.ts
  const resource = await prisma.thing.findUnique({ where: { id: input } });
  if (!resource) return { success: false, error: "Not found" };
  if (!canDoSomething({ id: user.id, role: user.role as Role }, resource)) {
    return { success: false, error: "Forbidden" };
  }

  // 3. Validate input with a shared Zod schema from lib/schemas.ts
  const parsed = mySchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  // 4. Persist
  await prisma.thing.update({ ... });

  // 5. Bust the Next.js cache
  revalidatePath("/relevant-path");

  return { success: true, data: undefined };
}
```

## `ActionResult` type

Defined in `src/server/actions/auth.ts`. Always return this shape — never throw from an action body (only `requireAuth`/`requireAdmin` throw internally):

```typescript
type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## Role casting

The session `user.role` is typed as `string` (JWT limitation). Cast it when calling permissions helpers:

```typescript
import type { Role } from "@/generated/prisma/enums";
canEditItem({ id: user.id, role: user.role as Role }, item)
```

## Image uploads (items and avatars)

- Item images: max 5 MB, JPEG/PNG/WebP/GIF allowed. Saved as `{uuid}{ext}` under `UPLOAD_DIR`.
- Avatars: max 3 MB, JPEG/PNG/WebP only. Saved as `avatar_{uuid}{ext}`. Old avatar is deleted before writing the new one.
- `UPLOAD_DIR` defaults to `process.cwd()/public/uploads` locally, overridden by the env var in Docker.
- On item delete: old image is unlinked (`.catch(() => {})` swallowed — missing file is not an error).
- On item update: old image is unlinked before saving the new one. `removeImage=true` in FormData triggers deletion without replacement.

## Admin actions

Admin actions live at the bottom of `users.ts` and use `requireAdmin()` (calls `requireAuth()` then checks `canManageUsers`). An admin cannot delete themselves.

## Crown uniqueness

`upsertScoreAction` enforces one crown per user per topic by running `updateMany` to clear other crowns before the upsert. There is no DB-level unique constraint for this — the logic is purely in the action.
