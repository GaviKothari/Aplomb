// Adds new UserRole enum values that cannot be added inside a Prisma migration
// transaction. Called from Dockerfile CMD before prisma migrate deploy.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const values = ['REPORT_MAKER', 'FINALIZER', 'MIS_EXECUTIVE', 'VIEWER'];

async function main() {
  for (const v of values) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${v}'`,
      );
      console.log(`[setup-enums] ensured: ${v}`);
    } catch (e) {
      console.log(`[setup-enums] skip ${v}: ${e.message}`);
    }
  }
}

main()
  .catch(e => { console.error('[setup-enums] error:', e.message); })
  .finally(() => prisma.$disconnect());
