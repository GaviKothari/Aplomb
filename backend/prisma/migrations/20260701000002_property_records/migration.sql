-- Property Intelligence: structured knowledge base built from every finalized case.
-- One row per case (upserted each time field data / status updates).

CREATE TABLE IF NOT EXISTS "property_records" (
  "id"                  TEXT NOT NULL,
  "caseId"              TEXT NOT NULL,
  "organizationId"      TEXT NOT NULL,

  -- address
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

  -- geo
  "latitude"            DECIMAL(10,8),
  "longitude"           DECIMAL(11,8),

  -- property
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

  -- valuation
  "totalMarketValue"    DECIMAL(15,2),
  "ratePerSqFt"         DECIMAL(10,2),
  "landRatePerSqFt"     DECIMAL(10,2),
  "buildingRatePerSqFt" DECIMAL(10,2),
  "distressValue"       DECIMAL(15,2),

  -- context
  "bankName"            TEXT,
  "engineerName"        TEXT,
  "siteObservations"    TEXT,
  "reportDate"          TIMESTAMP(3),
  "valuationYear"       INTEGER,

  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "property_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "property_records_caseId_key"
  ON "property_records"("caseId");

CREATE INDEX IF NOT EXISTS "property_records_organizationId_idx"
  ON "property_records"("organizationId");

CREATE INDEX IF NOT EXISTS "property_records_pincode_organizationId_idx"
  ON "property_records"("pincode", "organizationId");

CREATE INDEX IF NOT EXISTS "property_records_societyName_organizationId_idx"
  ON "property_records"("societyName", "organizationId");

CREATE INDEX IF NOT EXISTS "property_records_valuationYear_organizationId_idx"
  ON "property_records"("valuationYear", "organizationId");

ALTER TABLE "property_records"
  ADD CONSTRAINT "property_records_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_records"
  ADD CONSTRAINT "property_records_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
