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

  // All property type display strings the UI can send.
  // Belt-and-suspenders: even if ALTER TABLE TYPE TEXT below fails (e.g. no DIRECT_URL),
  // these values are valid PropertyType enum members and PostgreSQL will accept them.
  // ALTER TYPE ADD VALUE runs outside transactions — works fine through PgBouncer.
  const propertyTypeValues = [
    'APF PROJECT', 'Affordable Flat', 'Authority Flat', 'Builder Flat', 'Builder Floor',
    'Bungalow', 'Commercial Building', 'Commercial Floor', 'Commercial Office',
    'Commercial Property', 'Commercial Shop', 'Commercial Space', 'DDA Flat',
    'DDA LIG Flat', 'DDA MIG Flat', 'DDA SFS Flat', 'Developer Flat', 'Developer Floor',
    'Developer Villa', 'Duplex Flat', 'Duplex House', 'EWS Flat', 'Flat',
    'Flat/Apartment', 'GDA Flat', 'Hospital', 'Hotel', 'Independent Commercial Property',
    'Independent House', 'Individual Floor', 'Individual House', 'Industrial Building',
    'Janta Flat', 'LIG Flat', 'MIG Flat', 'Mixed Use', 'Office Space', 'Pent House',
    'Plot/Land', 'Proposed Building', 'Resort', 'Row House', 'SCO Plot', 'School Property',
    'Service Apartment', 'Shop', 'Society Flat', 'Society Floor', 'Under Construction',
    'Vacant Land', 'Vacant Plot', 'Villa', 'Warehouse',
  ];
  for (const v of propertyTypeValues) {
    await exec(
      `ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS '${v.replace(/'/g, "''")}'`,
      `PropertyType '${v}'`,
    );
  }

  // Construction stage display strings the engineer form sends.
  const constructionStageValues = ['Under Construction', 'Ready to Move', 'Old Construction', 'Completed (New)'];
  for (const v of constructionStageValues) {
    await exec(
      `ALTER TYPE "ConstructionStage" ADD VALUE IF NOT EXISTS '${v.replace(/'/g, "''")}'`,
      `ConstructionStage '${v}'`,
    );
  }

  // Change constructionStage from enum to TEXT on reports table
  // (model Report maps to @@map("reports"), NOT "valuation_reports")
  await exec(
    `ALTER TABLE "reports" ALTER COLUMN "constructionStage" TYPE TEXT USING "constructionStage"::TEXT`,
    'reports.constructionStage → TEXT',
  );

  // Change propertyType from enum to TEXT on cases and reports
  await exec(
    `ALTER TABLE "cases" ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT`,
    'cases.propertyType → TEXT',
  );
  await exec(
    `ALTER TABLE "reports" ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT`,
    'reports.propertyType → TEXT',
  );

  // Expand roadWidth precision: DECIMAL(5,2) maxed out at 999.99; engineers enter feet (can exceed 1000)
  await exec(
    `ALTER TABLE "reports" ALTER COLUMN "roadWidth" TYPE DECIMAL(8, 2)`,
    'reports.roadWidth → DECIMAL(8,2)',
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
