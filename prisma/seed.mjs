import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Admin';

  if (!email || !password) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.');
    return;
  }

  // Only seed on a fresh database (no users at all). If any user exists, the
  // DB was already initialized on a previous start — skip unconditionally.
  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "User"');
  if (parseInt(countRows[0].count, 10) > 0) {
    console.log('Database already has users — skipping admin seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO "User" (id, email, "displayName", "passwordHash", role, locale, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'ADMIN'::"Role", $5, NOW(), NOW())`,
    [randomUUID(), email, displayName, passwordHash, 'en']
  );
  console.log(`Created admin user: ${email}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => pool.end());
