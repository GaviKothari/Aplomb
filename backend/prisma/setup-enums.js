// Runs schema changes that cannot go inside Prisma's transaction wrapper:
//   - ALTER TYPE ... ADD VALUE (PostgreSQL forbids this inside a transaction)
//   - Column type changes (ALTER TABLE ... TYPE TEXT)
// Must use DIRECT_URL (non-pooled) — PgBouncer blocks DDL over the pooled URL.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

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

  // Change constructionStage from enum to TEXT on valuation_reports
  await exec(
    `ALTER TABLE "valuation_reports" ALTER COLUMN "constructionStage" TYPE TEXT USING "constructionStage"::TEXT`,
    'valuation_reports.constructionStage → TEXT',
  );

  // Change propertyType from enum to TEXT on cases and valuation_reports
  // so any string (e.g. "Builder Flat", "DDA LIG Flat") can be stored.
  await exec(
    `ALTER TABLE "cases" ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT`,
    'cases.propertyType → TEXT',
  );
  await exec(
    `ALTER TABLE "valuation_reports" ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT`,
    'valuation_reports.propertyType → TEXT',
  );

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
