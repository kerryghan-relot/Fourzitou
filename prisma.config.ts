import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // env() throws if unset; fall back to a placeholder so `prisma generate`
    // works in Docker build stages where DATABASE_URL isn't available yet.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/fourzitou",
  },
});
