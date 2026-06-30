// Runs schema changes that cannot go inside Prisma's transaction wrapper:
//   - ALTER TYPE ... ADD VALUE (PostgreSQL forbids this inside a transaction)
//   - The three new employee columns (idempotent with IF NOT EXISTS)
// Called from the Dockerfile CMD before prisma migrate deploy.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`[setup-db] OK: ${label}`);
  } catch (e) {
    console.log(`[setup-db] skip ${label}: ${e.message}`);
  }
}

async function main() {
  // New UserRole enum values
  for (const v of ['REPORT_MAKER', 'FINALIZER', 'MIS_EXECUTIVE', 'VIEWER']) {
    await exec(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${v}'`, `role ${v}`);
  }

  // New employee columns
  await exec(
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "employeeStatus" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    'column employeeStatus',
  );
  await exec(
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "invitationStatus" TEXT NOT NULL DEFAULT 'PENDING'`,
    'column invitationStatus',
  );
  await exec(
    `ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3)`,
    'column invitationSentAt',
  );
}

main()
  .catch(e => console.error('[setup-db] fatal:', e.message))
  .finally(() => prisma.$disconnect());
