-- Migration: document_intelligence
-- Extends case_documents with OCR fields; adds document_pages, property_master,
-- property_fields, property_master_history.
-- All statements are idempotent — safe to run even if setup-enums.js ran first.

-- ── 1. Extend case_documents (table exists from initial migration) ────────────

ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "documentType"      TEXT    NOT NULL DEFAULT 'OTHER';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "originalName"      TEXT    NOT NULL DEFAULT '';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "mimeType"          TEXT    NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "sizeBytes"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "shareWithEngineer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "ocrStatus"         TEXT    NOT NULL DEFAULT 'PENDING';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "extractionStatus"  TEXT    NOT NULL DEFAULT 'PENDING';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "pageCount"         INTEGER;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "notes"             TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make legacy columns nullable
ALTER TABLE "case_documents" ALTER COLUMN "fileName"      DROP NOT NULL;
ALTER TABLE "case_documents" ALTER COLUMN "fileType"      DROP NOT NULL;
ALTER TABLE "case_documents" ALTER COLUMN "fileSizeBytes" DROP NOT NULL;
ALTER TABLE "case_documents" ALTER COLUMN "s3Bucket"      DROP NOT NULL;

-- ── 2. document_pages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "document_pages" (
  "id"         TEXT         NOT NULL,
  "documentId" TEXT         NOT NULL,
  "pageNumber" INTEGER      NOT NULL,
  "imageS3Key" TEXT,
  "rawText"    TEXT,
  "ocrStatus"  TEXT         NOT NULL DEFAULT 'PENDING',
  "ocrEngine"  TEXT,
  "wordCount"  INTEGER,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_pages_documentId_pageNumber_key"
  ON "document_pages"("documentId", "pageNumber");

CREATE INDEX IF NOT EXISTS "document_pages_documentId_idx"
  ON "document_pages"("documentId");

DO $$ BEGIN
  ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "case_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. property_master ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "property_master" (
  "id"           TEXT         NOT NULL,
  "caseId"       TEXT         NOT NULL,
  "version"      INTEGER      NOT NULL DEFAULT 1,
  "status"       TEXT         NOT NULL DEFAULT 'DRAFT',
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "confirmedAt"  TIMESTAMP(3),
  "masterJson"   JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_master_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "property_master_caseId_key" UNIQUE ("caseId")
);

-- ── 4. property_fields ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "property_fields" (
  "id"               TEXT         NOT NULL,
  "propertyMasterId" TEXT         NOT NULL,
  "fieldKey"         TEXT         NOT NULL,
  "fieldValue"       TEXT,
  "label"            TEXT,
  "confidence"       DECIMAL(5,4),
  "sourcePage"       INTEGER,
  "sourceLine"       TEXT,
  "sourceDocumentId" TEXT,
  "isManualEdit"     BOOLEAN      NOT NULL DEFAULT false,
  "editedById"       TEXT,
  "editedAt"         TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_fields_pkey"                  PRIMARY KEY ("id"),
  CONSTRAINT "property_fields_masterId_fieldKey_key" UNIQUE ("propertyMasterId", "fieldKey")
);

ALTER TABLE "property_fields" ADD COLUMN IF NOT EXISTS "label" TEXT;

CREATE INDEX IF NOT EXISTS "property_fields_masterId_idx"
  ON "property_fields"("propertyMasterId");

DO $$ BEGIN
  ALTER TABLE "property_fields" ADD CONSTRAINT "property_fields_masterId_fkey"
    FOREIGN KEY ("propertyMasterId") REFERENCES "property_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. property_master_history ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "property_master_history" (
  "id"               TEXT         NOT NULL,
  "propertyMasterId" TEXT         NOT NULL,
  "changedById"      TEXT         NOT NULL,
  "changeType"       TEXT         NOT NULL,
  "fieldKey"         TEXT,
  "before"           TEXT,
  "after"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_master_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "property_master_history_masterId_idx"
  ON "property_master_history"("propertyMasterId");

DO $$ BEGIN
  ALTER TABLE "property_master_history" ADD CONSTRAINT "property_master_history_masterId_fkey"
    FOREIGN KEY ("propertyMasterId") REFERENCES "property_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Document intelligence: classified type + confidence
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "classifiedType" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "classificationConfidence" DECIMAL(5,4);

-- Property fields label column
ALTER TABLE "property_fields" ADD COLUMN IF NOT EXISTS "label" TEXT;
