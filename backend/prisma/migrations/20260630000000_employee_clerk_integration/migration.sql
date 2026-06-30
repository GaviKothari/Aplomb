-- Add invitation tracking and employment status columns to employees
-- NOTE: New UserRole enum values (REPORT_MAKER, FINALIZER, MIS_EXECUTIVE, VIEWER)
-- are added via prisma/setup-enums.js at startup because PostgreSQL does not allow
-- ALTER TYPE ... ADD VALUE inside a transaction block.
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "employeeStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "invitationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3);
