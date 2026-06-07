---
paths:
  - src/components/**
  - src/app/**
---

# Component conventions

## Client vs server

- `"use client"` at the top of files that use hooks, browser APIs, or event handlers.
- Server Components (no directive) can call `auth()`, `prisma`, and `getTranslations` directly.
- The `(app)/layout.tsx` is a Server Component that fetches `avatarPath` from the DB and passes it to `AppNav`.
- `AppNav` itself is a Client Component (uses `usePathname`, `useState`, `localStorage`).

## Passing data down

Data flows from Server Components (page/layout) down to Client Components as props. Client Components do not fetch from the DB — they receive everything they need as props or call Server Actions for mutations.

## Translations

Client components: `useTranslations("namespace")`. Server components: `await getTranslations("namespace")`. Always use the existing namespace from `messages/en.json` — add new keys to both `en.json` and `fr.json` before using them.

## Images

Item and avatar images are always referenced as `/api/uploads/{filename}`, never as `/uploads/{filename}` or direct filesystem paths. The `imagePath` field in the DB stores only the filename (e.g., `uuid.jpg`), not the full path.

## AppNav and navigation

`AppNav` renders: logo → Topics link → ThemeToggle → `UserMenu` (avatar/initials + chevron → dropdown with Settings link + Sign Out button). No other nav links exist. All settings-adjacent features live under `/settings/*` accessed from the dropdown.

## Settings hub

`/settings` redirects to `/settings/profile`. The `(app)/settings/layout.tsx` wraps all settings pages with a left sidebar (`SettingsSidebar`). The sidebar shows: Profile, Security, Statistics, and Admin (ADMIN role only). The sidebar is a Client Component that uses `usePathname()` to highlight the active tab.

## Destructive actions

Every destructive action (delete item, delete topic, delete user, remove avatar) must go through `ConfirmDialog` before calling the server action. `ConfirmDialog` accepts a `destructive` boolean that styles the confirm button in red.

## Comments

Comments are edit-only. No delete button is shown anywhere in the UI. `CommentList` allows the author to edit inline (pencil icon on hover). The `updateCommentAction` is the only comment mutation.

## Score optimism

`ScoreControls` uses `useOptimistic` for instant star/crown/poop feedback. Do not add loading spinners to score controls — the optimistic update makes them feel instant.

## Theme

Light/dark/auto theme is managed entirely in `AppNav`'s `ThemeToggle` component using `localStorage` and `document.documentElement.classList`. No server-side theme state.
