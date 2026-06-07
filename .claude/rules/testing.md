---
paths:
  - src/test/**
  - vitest.config.*
  - playwright.config.*
---

# Testing

## Stack

- **Vitest** — unit and component tests (`pnpm test` / `pnpm test:watch`)
- **React Testing Library** — component tests in jsdom
- **MSW v2** — mocks fetch at the network layer for component tests
- **Playwright** — end-to-end tests (`pnpm test:e2e`)

## Test locations

```
src/test/
  unit/               Pure function tests — no DOM, no network
  component/          RTL component tests in jsdom
  mocks/
    handlers.ts       MSW request handlers
    server.ts         MSW server (started in setup.ts)
  setup.ts            Global setup: @testing-library/jest-dom matchers + MSW lifecycle
```

## Running a single test file

```bash
pnpm test src/test/unit/scoring.test.ts
pnpm test src/test/component/CommentList.test.tsx
```

## Unit test style

Unit tests cover pure modules in `src/lib/`: `scoring.ts`, `permissions.ts`, `password.ts`. They import directly from `@/lib/...` with no mocking needed.

```typescript
import { describe, it, expect } from "vitest";
import { aggregateScores } from "@/lib/scoring";

describe("aggregateScores", () => {
  it("returns zeros for empty input", () => {
    expect(aggregateScores([])).toEqual({ averageStars: 0, crownCount: 0, poopCount: 0, voterCount: 0 });
  });
});
```

## Component test style

Component tests use RTL + `userEvent`. Server Actions are mocked via MSW or `vi.mock`. Use `@testing-library/jest-dom` matchers (imported via `setup.ts`).

## What not to test

- Prisma queries directly — no test database is wired up for unit/component tests; use integration/E2E for DB-touching code
- Next.js routing — Playwright handles that
- shadcn/ui internals — test behaviour, not implementation

## Playwright

E2E tests live in `tests/e2e/` (outside `src/`). They run against a live Next.js instance. Use `pnpm test:e2e:ui` for interactive debugging.
