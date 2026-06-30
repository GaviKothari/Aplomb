-- Change propertyType from enum to text on cases and valuation_reports.
-- Stores detailed Indian property sub-types ("Builder Flat", "DDA LIG Flat", etc.)
-- The coarse 10-value PropertyType enum is retained for RateCard / ReportTemplate.

ALTER TABLE "cases"
  ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT;

ALTER TABLE "valuation_reports"
  ALTER COLUMN "propertyType" TYPE TEXT USING "propertyType"::TEXT;
