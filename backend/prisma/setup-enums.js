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

  // property_records table (bypasses Prisma migration state issues)
  await exec(`
    CREATE TABLE IF NOT EXISTS "property_records" (
      "id"                  TEXT NOT NULL,
      "caseId"              TEXT NOT NULL,
      "organizationId"      TEXT NOT NULL,
      "rawAddress"          TEXT NOT NULL,
      "normalizedAddress"   TEXT,
      "flatNumber"          TEXT,
      "floorNumber"         TEXT,
      "towerName"           TEXT,
      "societyName"         TEXT,
      "locality"            TEXT,
      "sector"              TEXT,
      "city"                TEXT NOT NULL,
      "pincode"             TEXT NOT NULL,
      "latitude"            DECIMAL(10,8),
      "longitude"           DECIMAL(11,8),
      "propertyType"        TEXT,
      "propertyDescription" TEXT,
      "totalArea"           DECIMAL(10,2),
      "builtUpArea"         DECIMAL(10,2),
      "carpetArea"          DECIMAL(10,2),
      "plotArea"            DECIMAL(10,2),
      "totalFloors"         INTEGER,
      "ageOfConstruction"   INTEGER,
      "facingDirection"     TEXT,
      "constructionStage"   TEXT,
      "amenities"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "roadWidth"           DECIMAL(8,2),
      "totalMarketValue"    DECIMAL(15,2),
      "ratePerSqFt"         DECIMAL(10,2),
      "landRatePerSqFt"     DECIMAL(10,2),
      "buildingRatePerSqFt" DECIMAL(10,2),
      "distressValue"       DECIMAL(15,2),
      "bankName"            TEXT,
      "engineerName"        TEXT,
      "siteObservations"    TEXT,
      "reportDate"          TIMESTAMP(3),
      "valuationYear"       INTEGER,
      "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "property_records_pkey" PRIMARY KEY ("id")
    )
  `, 'CREATE TABLE property_records');

  await exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS "property_records_caseId_key" ON "property_records"("caseId")`,
    'index property_records_caseId',
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "property_records_organizationId_idx" ON "property_records"("organizationId")`,
    'index property_records_organizationId',
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "property_records_pincode_organizationId_idx" ON "property_records"("pincode", "organizationId")`,
    'index property_records_pincode',
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "property_records_societyName_organizationId_idx" ON "property_records"("societyName", "organizationId")`,
    'index property_records_societyName',
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "property_records_valuationYear_organizationId_idx" ON "property_records"("valuationYear", "organizationId")`,
    'index property_records_valuationYear',
  );
  await exec(
    `ALTER TABLE "property_records" ADD CONSTRAINT "property_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    'fk property_records → cases',
  );
  await exec(
    `ALTER TABLE "property_records" ADD CONSTRAINT "property_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    'fk property_records → organizations',
  );

  // ── Document Intelligence tables ──────────────────────────────────────────

  // case_documents already exists (from initial Prisma migration) — add OCR columns
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "documentType"      TEXT    NOT NULL DEFAULT 'OTHER'`,                   'case_documents.documentType');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "originalName"      TEXT    NOT NULL DEFAULT ''`,                         'case_documents.originalName');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "mimeType"          TEXT    NOT NULL DEFAULT 'application/octet-stream'`,  'case_documents.mimeType');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "sizeBytes"         INTEGER NOT NULL DEFAULT 0`,                           'case_documents.sizeBytes');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "shareWithEngineer" BOOLEAN NOT NULL DEFAULT false`,                       'case_documents.shareWithEngineer');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "ocrStatus"         TEXT    NOT NULL DEFAULT 'PENDING'`,                   'case_documents.ocrStatus');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "extractionStatus"  TEXT    NOT NULL DEFAULT 'PENDING'`,                   'case_documents.extractionStatus');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "pageCount"         INTEGER`,                                              'case_documents.pageCount');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "notes"             TEXT`,                                                 'case_documents.notes');
  await exec(`ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,      'case_documents.updatedAt');
  await exec(`ALTER TABLE "case_documents" ALTER COLUMN "fileName"      DROP NOT NULL`, 'case_documents.fileName nullable');
  await exec(`ALTER TABLE "case_documents" ALTER COLUMN "fileType"      DROP NOT NULL`, 'case_documents.fileType nullable');
  await exec(`ALTER TABLE "case_documents" ALTER COLUMN "fileSizeBytes" DROP NOT NULL`, 'case_documents.fileSizeBytes nullable');
  await exec(`ALTER TABLE "case_documents" ALTER COLUMN "s3Bucket"      DROP NOT NULL`, 'case_documents.s3Bucket nullable');
  await exec(`CREATE INDEX IF NOT EXISTS "case_documents_caseId_idx" ON "case_documents"("caseId")`, 'index case_documents_caseId');

  await exec(`
    CREATE TABLE IF NOT EXISTS "document_pages" (
      "id"          TEXT NOT NULL,
      "documentId"  TEXT NOT NULL,
      "pageNumber"  INTEGER NOT NULL,
      "imageS3Key"  TEXT,
      "rawText"     TEXT,
      "ocrStatus"   TEXT NOT NULL DEFAULT 'PENDING',
      "ocrEngine"   TEXT,
      "wordCount"   INTEGER,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "document_pages_documentId_pageNumber_key" UNIQUE ("documentId", "pageNumber")
    )
  `, 'CREATE TABLE document_pages');

  await exec(
    `CREATE INDEX IF NOT EXISTS "document_pages_documentId_idx" ON "document_pages"("documentId")`,
    'index document_pages_documentId',
  );
  await exec(
    `ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    'fk document_pages → case_documents',
  );

  await exec(`
    CREATE TABLE IF NOT EXISTS "property_master" (
      "id"           TEXT NOT NULL,
      "caseId"       TEXT NOT NULL,
      "version"      INTEGER NOT NULL DEFAULT 1,
      "status"       TEXT NOT NULL DEFAULT 'DRAFT',
      "reviewedById" TEXT,
      "reviewedAt"   TIMESTAMP(3),
      "confirmedAt"  TIMESTAMP(3),
      "masterJson"   JSONB,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "property_master_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "property_master_caseId_key" UNIQUE ("caseId")
    )
  `, 'CREATE TABLE property_master');

  await exec(`
    CREATE TABLE IF NOT EXISTS "property_fields" (
      "id"               TEXT NOT NULL,
      "propertyMasterId" TEXT NOT NULL,
      "fieldKey"         TEXT NOT NULL,
      "fieldValue"       TEXT,
      "confidence"       DECIMAL(5,4),
      "sourcePage"       INTEGER,
      "sourceLine"       TEXT,
      "sourceDocumentId" TEXT,
      "isManualEdit"     BOOLEAN NOT NULL DEFAULT false,
      "editedById"       TEXT,
      "editedAt"         TIMESTAMP(3),
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "property_fields_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "property_fields_masterId_fieldKey_key" UNIQUE ("propertyMasterId", "fieldKey")
    )
  `, 'CREATE TABLE property_fields');

  await exec(
    `CREATE INDEX IF NOT EXISTS "property_fields_masterId_idx" ON "property_fields"("propertyMasterId")`,
    'index property_fields_masterId',
  );
  await exec(
    `ALTER TABLE "property_fields" ADD CONSTRAINT "property_fields_masterId_fkey" FOREIGN KEY ("propertyMasterId") REFERENCES "property_master"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    'fk property_fields → property_master',
  );

  await exec(`
    CREATE TABLE IF NOT EXISTS "property_master_history" (
      "id"               TEXT NOT NULL,
      "propertyMasterId" TEXT NOT NULL,
      "changedById"      TEXT NOT NULL,
      "changeType"       TEXT NOT NULL,
      "fieldKey"         TEXT,
      "before"           TEXT,
      "after"            TEXT,
      "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "property_master_history_pkey" PRIMARY KEY ("id")
    )
  `, 'CREATE TABLE property_master_history');

  await exec(
    `CREATE INDEX IF NOT EXISTS "property_master_history_masterId_idx" ON "property_master_history"("propertyMasterId")`,
    'index property_master_history_masterId',
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
