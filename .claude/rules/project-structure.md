# Project structure

Fourzitou is a private group-ranking app (Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, Prisma 7, next-intl v4, Auth.js v5). Self-hosted via Docker Compose. No cloud dependency.

## Top-level layout

```
.claude/          Claude Code settings and rules
messages/         i18n message catalogs (en.json, fr.json)
prisma/           schema.prisma, seed.ts (TypeScript), seed.mjs (ESM runtime copy)
public/uploads/   Local dev upload target (.gitkeep only; Docker volume in prod)
src/
  app/            Next.js App Router pages and API routes
  components/     React components (client and server)
  generated/      Prisma client output — never edit manually
  i18n/           next-intl config (routing + request resolver)
  lib/            Pure utility modules (no framework coupling)
  server/actions/ All server-side mutations ("use server")
  test/           Vitest unit/component tests + MSW mocks
  types/          Global TypeScript declaration overrides
```

## `src/app/` — route tree

Two route groups separate auth pages from the authenticated shell:

```
(auth)/
  login/page.tsx       Sign-in form — public
  signup/page.tsx      Registration form — public

(app)/
  layout.tsx           Authenticated shell: checks session, fetches avatarPath, renders AppNav
  topics/
    page.tsx           Topic list (owned + shared, archive filter)
    [topicId]/page.tsx Topic detail: items grid, scores, members panel
  settings/
    layout.tsx         Wraps all /settings/* pages with SettingsSidebar
    page.tsx           Redirects to /settings/profile
    profile/page.tsx   Display name, locale, avatar upload
    security/page.tsx  Password change with live strength meter
    stats/page.tsx     Personal stats dashboard
    admin/page.tsx     User management (ADMIN role only — guarded server-side)
  profile/page.tsx     → redirects to /settings/profile
  stats/page.tsx       → redirects to /settings/stats
  admin/users/page.tsx → redirects to /settings/admin

api/
  auth/[...nextauth]/route.ts   Auth.js handlers
  uploads/[...path]/route.ts    Authenticated image streaming from UPLOAD_DIR
```

The `(auth)` group has no layout; the `(app)` group layout is the authenticated shell that redirects to `/login` if there is no session.

## `src/components/` — component tree

```
layout/
  AppNav.tsx          Sticky navbar: logo + Topics link + ThemeToggle + UserMenu (avatar dropdown)
  SettingsSidebar.tsx Client sidebar with tab links for /settings/* pages; highlights active tab via usePathname()

topics/
  TopicList.tsx       Lists topics, shows owner/shared badge, archive toggle
  TopicFormModal.tsx  Create/edit topic modal — emoji picker + color picker + title
  TopicDetailView.tsx Client wrapper for an individual topic: sorts items, passes userCrownItemId down
  TopicMembersPanel.tsx Add/remove members by displayName (owner-only)

items/
  ItemCard.tsx        Card grid cell: image, title, ScoreControls, comment count badge, edit/delete on hover
  ItemFormModal.tsx   Create/edit item: title, Markdown description, optional image upload
  ItemModal.tsx       Full-screen item detail modal: Markdown body, full ScoreControls, CommentList
  ScoreControls.tsx   Inline star (1-5) + crown + poop controls; uses useOptimistic for instant feedback

comments/
  CommentList.tsx     Renders all comments for an item; own comments are editable inline (no delete)
  CommentForm.tsx     New comment textarea + submit

settings/
  PasswordChangeForm.tsx  Password change form with live strength checklist (criteria booleans from lib/password.ts)

profile/
  ProfileForm.tsx     Display name + locale selector; calls router.refresh() after save so next-intl picks up the new locale immediately

admin/
  UserManagementPanel.tsx  ADMIN-only user table: create user, reset password, delete user
  SuggestionTable.tsx      ADMIN-only submission table: sort, column visibility, thumb reactions, soft-delete, detail modal

suggestions/
  FloatingSuggestionButton.tsx  Fixed bottom-left floating button + inline SuggestionFormModal; always mounted to preserve draft on dismiss

ui/
  ConfirmDialog.tsx   Reusable confirmation modal (used before every destructive action)
```

## `src/lib/` — pure modules

| File | Purpose |
|---|---|
| `db.ts` | Prisma singleton (`PrismaPg` adapter, global cache for dev hot-reload) |
| `scoring.ts` | `aggregateScores`, `validateStars`, `getCrownItemIdForUser` — no DB, fully unit-tested |
| `permissions.ts` | Predicate functions (`canViewTopic`, `canEditItem`, …) — pure, no DB |
| `schemas.ts` | All Zod schemas shared between client and server actions |
| `password.ts` | `getPasswordStrength` → `{ strength, score, criteria }` — 3 required + 3 bonus criteria |
| `markdown.tsx` | `<MarkdownRenderer>` — react-markdown + remark-gfm + rehype-sanitize |
| `utils.ts` | `cn()`, `getInitials()`, `formatRelative()` |

## `src/server/actions/` — mutations

Each file groups actions by domain:

| File | Actions |
|---|---|
| `auth.ts` | `signUpAction`, `signInAction`; defines `ActionResult` type |
| `topics.ts` | `createTopicAction`, `updateTopicAction`, `archiveTopicAction`, `deleteTopicAction`, `addTopicMemberAction`, `removeTopicMemberAction` |
| `items.ts` | `createItemAction`, `updateItemAction`, `deleteItemAction`; handles image upload/deletion |
| `scores.ts` | `upsertScoreAction`; enforces crown uniqueness via `updateMany` before upserting |
| `comments.ts` | `createCommentAction`, `updateCommentAction` (no delete) |
| `users.ts` | `updateProfileAction`, `updateAvatarAction`, `removeAvatarAction`, `changePasswordAction`; admin: `adminCreateUserAction`, `adminResetPasswordAction`, `adminDeleteUserAction` |
| `suggestions.ts` | `createSuggestionAction` (all users); `adminUpdateSuggestionReactionAction`, `adminToggleRemoveSuggestionAction` (admin only) |

## `src/test/` — test layout

```
unit/
  scoring.test.ts      Pure function tests for lib/scoring.ts
  permissions.test.ts  Pure function tests for lib/permissions.ts
  password.test.ts     Pure function tests for lib/password.ts
  suggestions.test.ts  Schema validation tests for suggestionSchema
component/
  CommentList.test.tsx    RTL component test
  PasswordChangeForm.test.tsx  RTL component test
mocks/
  handlers.ts          MSW request handlers
  server.ts            MSW server setup
setup.ts               Vitest global setup (jest-dom matchers, MSW lifecycle)
```

## `prisma/`

- `schema.prisma` — models: `User`, `Topic`, `TopicMember`, `Item`, `Score`, `Comment`, `Suggestion`. Enums: `Role`, `SuggestionType` (BUG/IDEA/OTHER), `SuggestionReaction` (UP/DOWN). Prisma client is generated to `src/generated/prisma/` (not the default location).
- `seed.mjs` — idempotent admin seed; reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_DISPLAY_NAME` from env; skips if the email already exists.

## Key constraints

- `src/generated/prisma/` is gitignored — regenerated on every `pnpm install` via `postinstall`.
- Images are served exclusively through `/api/uploads/[...path]`, never from `public/` in production.
- Comments cannot be deleted by anyone, including admins (edit-only invariant).
- Crown uniqueness (one crown per user per topic) is enforced in `upsertScoreAction` via `updateMany`, not by a DB constraint.
- Suggestions are soft-deleted (`removed` boolean), never hard-deleted. The admin reaction (`UP`/`DOWN`) is a single mutually exclusive field per submission.
- Bug-type suggestions require an image — enforced in `createSuggestionAction` (server-side) and in `SuggestionFormModal` (client-side).
- The floating suggestion button is always mounted in `(app)/layout.tsx` so the form draft persists across navigation within the authenticated shell.
