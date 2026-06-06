# Fourzitou

> *Fourres-y-tout* — a private group-ranking app for friends.

When brainstorming together (movies for movie night, restaurants, games…), it's hard to converge on one choice. Fourzitou lets a small group create **Topics**, fill them with **Items** (title, description, optional image), and score each item independently — stars for quality, a **crown** for your favourite, and a **poop** for hard pass. Items support Markdown and a threaded comment trail.

Topics are private by default. The owner explicitly invites friends by display name.

---

## Features

- **Topics** — create, archive, share with specific users; emoji + colour header
- **Items** — Markdown description, optional image upload, inline scoring; sorted by score
- **Scoring** — 0–5 stars, one crown per user per topic, unlimited poops
- **Comments** — threaded per item, edit-only (no delete), Markdown body
- **Profile** — avatar upload, display name, language (FR / EN)
- **Security** — password change with live strength indicator
- **Stats** — personal dashboard (topics, items, comments, crowns given…)
- **Admin panel** — create / reset-password / delete users
- **i18n** — French and English, locale stored per user, applies immediately on save
- **Dark / light / auto** theme
- **Self-hosted** — single `docker compose up` command, no cloud dependency

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, React 19) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Auth | Auth.js v5 (NextAuth) — Credentials provider, JWT |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| i18n | next-intl v4 |
| Markdown | react-markdown + remark-gfm + rehype-sanitize |
| Image storage | Local filesystem, served via Next.js route handler |
| Package manager | pnpm 11 |
| Deployment | Docker Compose (app + postgres + named volumes) |
| Tests | Vitest + React Testing Library + Playwright |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- That's it — no Node.js or database required on your machine.

---

## Quick start

### 1. Clone

```bash
git clone <your-repo-url>
cd fourzitou
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for JWT signing — generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Email for the initial admin account |
| `ADMIN_PASSWORD` | Password for the initial admin account (min 6 characters) |
| `POSTGRES_PASSWORD` | Password for the PostgreSQL database |

> **Important:** the password in `DATABASE_URL` must match `POSTGRES_PASSWORD`. The default `.env.example` already wires this correctly — just change both to the same value if you update the database password.

### 3. Build and start

```bash
docker compose up -d --build
```

The first build takes a few minutes. What happens automatically on startup:

1. PostgreSQL starts and waits until healthy
2. The app pushes the Prisma schema to the database (creates all tables)
3. The admin account is seeded (skipped silently if it already exists)
4. Next.js starts on port 3000

Open **http://localhost:3000** and sign in with the credentials you set in `.env`.

---

## Day-to-day commands

```bash
# Start in the background (no rebuild — use this for normal starts)
docker compose up -d

# Stop (your data is preserved)
docker compose down

# View live logs
docker logs -f fourzitou-app-1

# Rebuild and restart after a code change
docker compose down && docker compose up -d --build

# Full reset — WARNING: deletes all data and uploaded images
docker compose down -v && docker compose up -d --build
```

> **When do I need `--build`?** Only when the source code has changed. If you're just starting and stopping the app, `docker compose up -d` is enough — it reuses the existing image and starts in seconds.

---

## Development setup (without Docker)

Run the app locally for hot-reload during development.

### Prerequisites

- Node.js 22+
- pnpm 11 — enable with `corepack enable && corepack prepare pnpm@latest --activate`
- A running PostgreSQL instance, or start only the database container with `docker compose up -d db`

### Steps

```bash
pnpm install

# Copy the env template and edit DATABASE_URL to use localhost:5432 instead of db:5432
cp .env.example .env

# Generate the Prisma client and push the schema to your local database
pnpm db:generate
pnpm db:push

# Seed the admin user (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env)
node prisma/seed.mjs

# Start the dev server with hot reload
pnpm dev
```

### Testing

```bash
# Unit + component tests (Vitest)
pnpm test

# Watch mode
pnpm test --watch

# End-to-end tests (Playwright — requires the app to be running)
pnpm test:e2e
```

---

## Environment variables

All variables are injected into the container at runtime by Docker Compose from your `.env` file. None are baked into the image.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | — | JWT signing secret (32+ random bytes) |
| `AUTH_TRUST_HOST` | Yes | — | Must be `true` when running behind Docker or a reverse proxy |
| `ADMIN_EMAIL` | Yes | — | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Yes | — | Password for the seeded admin account (min 6 characters) |
| `ADMIN_DISPLAY_NAME` | No | `Admin` | Display name for the seeded admin |
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL database password (must match the one in `DATABASE_URL`) |
| `UPLOAD_DIR` | No | `/app/uploads` | Path inside the container where uploaded images are stored |

---

## Data persistence

Two Docker named volumes are created automatically and survive `docker compose down`:

| Volume | Contains |
|---|---|
| `fourzitou_pgdata` | PostgreSQL database files |
| `fourzitou_uploads` | User-uploaded images |

Only `docker compose down -v` removes them (full reset).

---

## License

Private — all rights reserved.
