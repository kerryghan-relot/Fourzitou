# ── Stage 1: install deps ──────────────────────────────────────────────────────
FROM node:24-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run db:generate
RUN pnpm run build

# ── Stage 3: seed runtime deps (npm flat install — no pnpm symlink issues) ─────
FROM node:24-alpine AS seed-runtime
WORKDIR /seed
RUN npm install pg bcryptjs dotenv --no-fund --no-audit --no-save

# ── Stage 4: runner ────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + config (needed by `prisma db push`)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generated Prisma client — chowned so nextjs user can overwrite during db push
COPY --chown=nextjs:nodejs --from=builder /app/src/generated ./src/generated

# Prisma CLI (the build/index.js bundle is self-contained; .pnpm has the engines)
COPY --from=deps /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=deps /app/node_modules/dotenv ./node_modules/dotenv

# Seed runtime: pg + bcryptjs + dotenv from npm flat install
# Placed at prisma/node_modules so Node resolves them relative to seed.mjs
COPY --from=seed-runtime /seed/node_modules ./prisma/node_modules

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", \
  "node_modules/.bin/prisma db push && \
   node prisma/seed.mjs && \
   node server.js"]
