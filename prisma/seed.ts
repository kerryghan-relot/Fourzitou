import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? "Admin";

  if (!email || !password) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }

  // Only seed on a fresh database (no users at all). If any user exists, the
  // DB was already initialized on a previous start — skip unconditionally.
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Database already has users — skipping admin seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, displayName, passwordHash, role: Role.ADMIN },
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
