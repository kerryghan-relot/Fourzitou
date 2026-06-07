---
paths:
  - src/lib/permissions.ts
  - src/lib/schemas.ts
  - src/lib/password.ts
---

# Permissions, schemas, and password

## Permissions (`src/lib/permissions.ts`)

Pure predicate functions — no DB access, no side effects. All take a `UserCtx = { id: string; role: Role }` and a minimal resource object:

| Function | Who can? |
|---|---|
| `canViewTopic(user, { ownerId, memberIds })` | Admin, owner, or explicit member |
| `canEditTopic(user, { ownerId })` | Admin or owner |
| `canDeleteTopic` | Same as `canEditTopic` |
| `canManageTopicMembers` | Same as `canEditTopic` |
| `canEditItem(user, { creatorId })` | Admin or item creator |
| `canDeleteItem` | Same as `canEditItem` |
| `canEditComment(user, { authorId })` | Comment author only (no admin override) |
| `canManageUsers(user)` | Admin only |

Admins bypass ownership checks on topics and items but **not** on comments — nobody can edit someone else's comment.

Always call these in server actions **after** fetching the resource from the DB. Pass only the fields the function requires, not the full DB row.

## Shared schemas (`src/lib/schemas.ts`)

Zod schemas used by both client-side form validation and server-side action validation. When a validation rule changes (e.g., min password length), update the schema here — it propagates to both.

| Schema | Used for |
|---|---|
| `signInSchema` | Login form |
| `signUpSchema` | Registration + admin user creation |
| `topicSchema` | Create/edit topic (title, titleColor, emoji) |
| `itemSchema` | Create/edit item (title, description) |
| `scoreSchema` | Score input validation |
| `commentSchema` | Comment body (1–2000 chars) |
| `changePasswordSchema` | Password change (current + new + confirm; min 6 chars) |
| `updateProfileSchema` | Display name (2–30 chars, `[a-zA-Z0-9_-]` only) + locale enum |

`displayName` constraint: 2–30 chars, only letters, numbers, underscore, hyphen. This is enforced in both `signUpSchema` and `updateProfileSchema`.

## Password strength (`src/lib/password.ts`)

`getPasswordStrength(password)` → `{ strength: PasswordStrength, score: number, criteria: PasswordCriteria }`

**Required criteria** (all 3 must pass for password to be non-"weak"):
- `minLength`: `password.length >= 6`
- `uppercase`: `/[A-Z]/`
- `lowercase`: `/[a-z]/`

**Bonus criteria** (improve strength from "fair" to "good" to "strong"):
- Length ≥ 12
- Contains a digit
- Contains a special character

Strength levels:
- `weak` — fewer than 3 required criteria met
- `fair` — all 3 required, 0 bonus
- `good` — all 3 required, 1 bonus
- `strong` — all 3 required, 2–3 bonus

The `criteria` object (boolean map) is used by `PasswordChangeForm` to render a live checklist with ✓/✗ per criterion. The Zod schema enforces only the minimum (6 chars); the strength meter is purely informational.
