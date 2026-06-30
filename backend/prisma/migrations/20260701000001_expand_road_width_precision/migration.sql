-- Expand roadWidth from DECIMAL(5,2) to DECIMAL(8,2).
-- DECIMAL(5,2) overflows for values >= 1000 (e.g. road widths entered in feet).

ALTER TABLE "reports"
  ALTER COLUMN "roadWidth" TYPE DECIMAL(8, 2);
