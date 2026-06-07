---
paths:
  - src/lib/scoring.ts
  - src/server/actions/scores.ts
  - src/components/items/ScoreControls.tsx
  - src/components/topics/TopicDetailView.tsx
---

# Scoring system

## Data model

One `Score` row per `(itemId, userId)` pair (composite PK). Fields: `stars` (0–5 int), `crown` (bool), `poop` (bool). Defaults to `{ stars: 0, crown: false, poop: false }`.

## Pure helpers (`src/lib/scoring.ts`)

**`aggregateScores(scores)`** → `{ averageStars, crownCount, poopCount, voterCount }`
- `averageStars` counts only users who gave ≥ 1 star (users with `stars: 0` are not included in the average)
- `voterCount` = number of users with `stars > 0`
- Rounds average to one decimal place

**`validateStars(stars)`** — must be integer 0–5 inclusive

**`getCrownItemIdForUser(scores, userId)`** — returns the `itemId` crowned by this user, or `null`

These are pure functions with no DB access. Unit tests live in `src/test/unit/scoring.test.ts`.

## Score mutation (`upsertScoreAction`)

1. Validates stars with `validateStars`
2. Checks the user is a topic member (via `canViewTopic`)
3. **Crown uniqueness**: if `crown: true`, runs `updateMany` to set `crown: false` on all other items in the topic for this user before the upsert
4. Upserts the score row
5. Revalidates the topic page

There is no DB-level partial unique index for crown uniqueness — it is enforced entirely in the action.

## Optimistic UI (`ScoreControls`)

Uses React 19's `useOptimistic` to apply score changes instantly before the server action resolves. The optimistic state is derived from the current user's score entry. `useTransition` wraps the server action call. Clicking the same star value again clears it (toggle to 0).

The `userHasCrownElsewhere` prop is passed from `TopicDetailView` (computed once across all items) so `ScoreControls` can reflect crown state without knowing the full item list.

## Item sort order (`TopicDetailView`)

Items are sorted client-side before rendering:

| Rank | Condition |
|---|---|
| 2 (top) | `crownCount > 0 AND poopCount === 0` |
| 1 (middle) | everything else (including crown+poop cancellation) |
| 0 (bottom) | `poopCount > 0 AND crownCount === 0` |

Within the same rank, items are sorted by `averageStars` descending.
