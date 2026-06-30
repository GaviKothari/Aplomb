-- Change propertyType from enum to text on cases and reports.
-- The Report model maps to @@map("reports"), not "valuation_reports".
-- Stores detailed Indian property sub-types ("Builder Flat", "DDA LIG Flat", etc.)
-- The coarse 10-value PropertyType enum is retained for RateCard / ReportTemplate.

ALTER TABLE "cases"
  ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT;

ALTER TABLE "reports"
  ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT;

ALTER TABLE "reports"
  ALTER COLUMN "constructionStage" TYPE TEXT USING "constructionStage"::TEXT;
