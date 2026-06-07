---
paths:
  - docker-compose.yml
  - Dockerfile
  - .env
  - .env.example
---

# Docker and deployment

## Docker Compose services

Two services: `fourzitou-app` and `fourzitou-db`.

**`fourzitou-app`**:
- Built from the local `Dockerfile` (multi-stage: deps → build → runner with standalone output)
- Port: `${APP_PORT:-3000}:3000` — host port is configurable, container port is always 3000
- Depends on `fourzitou-db` with a healthcheck condition (pg_isready)
- Reads all env vars at runtime (nothing baked into the image)
- Mounts the `uploads` named volume at `${UPLOAD_DIR:-/app/uploads}`

**`fourzitou-db`**: postgres:16-alpine with a named volume at `/var/lib/postgresql/data`

## Named volumes

| Volume | Contains | Survives `docker compose down`? |
|---|---|---|
| `fourzitou_pgdata` | PostgreSQL data files | Yes — only `down -v` removes it |
| `fourzitou_uploads` | User-uploaded images | Yes — only `down -v` removes it |

`docker compose down -v` is the full reset — it deletes all data and uploaded images. Always confirm with the user before suggesting this.

## Environment variables

All vars are injected at runtime from the stack env (Portainer) or `.env` file. None are baked into the image.

Critical constraints:
- `DATABASE_URL` password must not contain `%` (breaks URL parsing in the pg driver)
- `POSTGRES_PASSWORD` must exactly match the password segment in `DATABASE_URL`
- `AUTH_TRUST_HOST=true` is required when running behind Docker or a reverse proxy
- `UPLOAD_DIR` inside the container must match the volume mount target in `docker-compose.yml`

## Container startup sequence

1. PostgreSQL starts; healthcheck polls `pg_isready` every 5 s (up to 10 retries)
2. App container starts only after DB is healthy
3. Entrypoint runs `prisma db push` (idempotent schema sync)
4. Entrypoint runs `node prisma/seed.mjs` (idempotent admin seed)
5. Next.js starts on port 3000

## Portainer GitOps

The stack is deployed via Portainer using "Deploy from repository". Webhook-triggered redeployment is enabled in Portainer with "Force redeployment" checked. On every push to `main`, GitHub calls the Portainer webhook, which pulls the latest code and rebuilds the stack.

Env vars are managed in Portainer's stack environment section, not committed to the repo.

## Common operations

```bash
# Rebuild after code change
docker compose up -d --build

# Restart without rebuild (config/env change only)
docker compose up -d

# View live logs
docker logs -f fourzitou-app

# Full data reset (DESTRUCTIVE — deletes all DB data and uploads)
docker compose down -v && docker compose up -d --build
```

## nginx reverse proxy

The app runs behind nginx with SSL termination. nginx `proxy_pass` points to `http://localhost:{APP_PORT}`. The `APP_PORT` env var uses a randomized value (e.g., `19119`) to avoid conflicts with other containers on the same host.
