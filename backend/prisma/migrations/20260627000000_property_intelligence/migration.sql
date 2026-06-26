-- Property Intelligence Engine migration
-- 1. Enable pg_trgm for fast similarity search on 150k demolition records
-- 2. Add GIN trigram index on demolition_properties.address
-- 3. Add DemolitionAlert.reasons (explainability) + human feedback columns
-- 4. Create address_aliases table (replaces hardcoded TS alias maps)

-- ── 1. pg_trgm extension ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. GIN index on demolition address (enables fast similarity search) ──────
-- Note: no CONCURRENTLY — Prisma runs migrations inside a transaction
CREATE INDEX IF NOT EXISTS idx_demolition_address_trgm
  ON demolition_properties USING GIN (address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_demolition_locality
  ON demolition_properties (locality)
  WHERE locality IS NOT NULL;

-- ── 3. DemolitionAlert — add reasons + feedback columns ──────────────────────
ALTER TABLE "demolition_alerts"
  ADD COLUMN IF NOT EXISTS "reasons"        JSONB,
  ADD COLUMN IF NOT EXISTS "humanFeedback"  TEXT,
  ADD COLUMN IF NOT EXISTS "feedbackBy"     TEXT,
  ADD COLUMN IF NOT EXISTS "feedbackAt"     TIMESTAMPTZ;

-- ── 4. AddressAlias table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "address_aliases" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "alias"     TEXT NOT NULL,
  "canonical" TEXT NOT NULL,
  "zone"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "address_aliases_alias_key"
  ON "address_aliases" ("alias");

CREATE INDEX IF NOT EXISTS "address_aliases_alias_idx"
  ON "address_aliases" ("alias");

-- ── 5. Seed canonical locality aliases ───────────────────────────────────────
-- These replace the hardcoded TypeScript alias map and are now DB-managed.
-- Admins can add/edit aliases without redeploying.
INSERT INTO "address_aliases" ("id", "alias", "canonical", "zone") VALUES
  (gen_random_uuid()::text, 'SHALIMARBAGH',       'SHALIMARBAGH',       'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'SHALIMAR BAGH',      'SHALIMARBAGH',       'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'ASHOKVIHAR',         'ASHOKVIHAR',         'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'ASHOK VIHAR',        'ASHOKVIHAR',         'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'ASHOKNAGAR',         'ASHOKNAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'ASHOK NAGAR',        'ASHOKNAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'NEW ASHOK NAGAR',    'NEWASHOKNAGAR',      'Shahdara Zone'),
  (gen_random_uuid()::text, 'NEWASHOKNAGAR',      'NEWASHOKNAGAR',      'Shahdara Zone'),
  (gen_random_uuid()::text, 'KIRTINAGAR',         'KIRTINAGAR',         'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'KIRTI NAGAR',        'KIRTINAGAR',         'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'RANIBAGH',           'RANIBAGH',           'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'RANI BAGH',          'RANIBAGH',           'Keshavpuram Zone'),
  (gen_random_uuid()::text, 'PITAMPURA',          'PITAMPURA',          'Rohini Zone'),
  (gen_random_uuid()::text, 'ROHINI',             'ROHINI',             'Rohini Zone'),
  (gen_random_uuid()::text, 'MANGOLPURI',         'MANGOLPURI',         'Rohini Zone'),
  (gen_random_uuid()::text, 'MANGOL PURI',        'MANGOLPURI',         'Rohini Zone'),
  (gen_random_uuid()::text, 'SULTANPURI',         'SULTANPURI',         'Rohini Zone'),
  (gen_random_uuid()::text, 'SULTAN PURI',        'SULTANPURI',         'Rohini Zone'),
  (gen_random_uuid()::text, 'TAGOREGARDEN',       'TAGOREGARDEN',       'Rohini Zone'),
  (gen_random_uuid()::text, 'TAGORE GARDEN',      'TAGOREGARDEN',       'Rohini Zone'),
  (gen_random_uuid()::text, 'BADLI',              'BADLI',              'Rohini Zone'),
  (gen_random_uuid()::text, 'KAROLBAGH',          'KAROLBAGH',          'Central Zone'),
  (gen_random_uuid()::text, 'KAROL BAGH',         'KAROLBAGH',          'Central Zone'),
  (gen_random_uuid()::text, 'PATELNAGAR',         'PATELNAGAR',         'Central Zone'),
  (gen_random_uuid()::text, 'PATEL NAGAR',        'PATELNAGAR',         'Central Zone'),
  (gen_random_uuid()::text, 'SHASTRINAGAR',       'SHASTRINAGAR',       'Central Zone'),
  (gen_random_uuid()::text, 'SHASTRI NAGAR',      'SHASTRINAGAR',       'Central Zone'),
  (gen_random_uuid()::text, 'SHASTRIPARK',        'SHASTRIPARK',        'Central Zone'),
  (gen_random_uuid()::text, 'SHASTRI PARK',       'SHASTRIPARK',        'Central Zone'),
  (gen_random_uuid()::text, 'PASCHIMVIHAR',       'PASCHIMVIHAR',       'West Zone'),
  (gen_random_uuid()::text, 'PASCHIM VIHAR',      'PASCHIMVIHAR',       'West Zone'),
  (gen_random_uuid()::text, 'JANAKPURI',          'JANAKPURI',          'West Zone'),
  (gen_random_uuid()::text, 'JANAK PURI',         'JANAKPURI',          'West Zone'),
  (gen_random_uuid()::text, 'VIKASPURI',          'VIKASPURI',          'West Zone'),
  (gen_random_uuid()::text, 'VIKAS PURI',         'VIKASPURI',          'West Zone'),
  (gen_random_uuid()::text, 'UTTAMNAGAR',         'UTTAMNAGAR',         'West Zone'),
  (gen_random_uuid()::text, 'UTTAM NAGAR',        'UTTAMNAGAR',         'West Zone'),
  (gen_random_uuid()::text, 'RAJAGARDEN',         'RAJAGARDEN',         'West Zone'),
  (gen_random_uuid()::text, 'RAJA GARDEN',        'RAJAGARDEN',         'West Zone'),
  (gen_random_uuid()::text, 'RAJOURIGARDEN',      'RAJOURIGARDEN',      'West Zone'),
  (gen_random_uuid()::text, 'RAJOURI GARDEN',     'RAJOURIGARDEN',      'West Zone'),
  (gen_random_uuid()::text, 'DWARKA',             'DWARKA',             'South Zone'),
  (gen_random_uuid()::text, 'VASANTKUNJ',         'VASANTKUNJ',         'South Zone'),
  (gen_random_uuid()::text, 'VASANT KUNJ',        'VASANTKUNJ',         'South Zone'),
  (gen_random_uuid()::text, 'VASANTVIHAR',        'VASANTVIHAR',        'South Zone'),
  (gen_random_uuid()::text, 'VASANT VIHAR',       'VASANTVIHAR',        'South Zone'),
  (gen_random_uuid()::text, 'HAUZKHAS',           'HAUZKHAS',           'South Zone'),
  (gen_random_uuid()::text, 'HAUZ KHAS',          'HAUZKHAS',           'South Zone'),
  (gen_random_uuid()::text, 'SAKET',              'SAKET',              'South Zone'),
  (gen_random_uuid()::text, 'LAJPATNAGAR',        'LAJPATNAGAR',        'South Zone'),
  (gen_random_uuid()::text, 'LAJPAT NAGAR',       'LAJPATNAGAR',        'South Zone'),
  (gen_random_uuid()::text, 'SARITAVIHAR',        'SARITAVIHAR',        'South Zone'),
  (gen_random_uuid()::text, 'SARITA VIHAR',       'SARITAVIHAR',        'South Zone'),
  (gen_random_uuid()::text, 'MALVIYANAGAR',       'MALVIYANAGAR',       'South Zone'),
  (gen_random_uuid()::text, 'MALVIYA NAGAR',      'MALVIYANAGAR',       'South Zone'),
  (gen_random_uuid()::text, 'GREATERKAILASH',     'GREATERKAILASH',     'South Zone'),
  (gen_random_uuid()::text, 'GREATER KAILASH',    'GREATERKAILASH',     'South Zone'),
  (gen_random_uuid()::text, 'GK',                 'GREATERKAILASH',     'South Zone'),
  (gen_random_uuid()::text, 'GK1',                'GREATERKAILASH',     'South Zone'),
  (gen_random_uuid()::text, 'GK2',                'GREATERKAILASH',     'South Zone'),
  (gen_random_uuid()::text, 'JANGPURA',           'JANGPURA',           'South Zone'),
  (gen_random_uuid()::text, 'OKHLA',              'OKHLA',              'South Zone'),
  (gen_random_uuid()::text, 'MEHRAULI',           'MEHRAULI',           'South Zone'),
  (gen_random_uuid()::text, 'MAYURVIHAR',         'MAYURVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'MAYUR VIHAR',        'MAYURVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'PREETVIHAR',         'PREETVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'PREET VIHAR',        'PREETVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'SHAHDARA',           'SHAHDARA',           'Shahdara Zone'),
  (gen_random_uuid()::text, 'LAXMINAGAR',         'LAXMINAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'LAXMI NAGAR',        'LAXMINAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'PATPARGANJ',         'PATPARGANJ',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'KONDLI',             'KONDLI',             'Shahdara Zone'),
  (gen_random_uuid()::text, 'YAMUNAVIHAR',        'YAMUNAVIHAR',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'YAMUNA VIHAR',       'YAMUNAVIHAR',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'BHAJANPURA',         'BHAJANPURA',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'BHAJAN PURA',        'BHAJANPURA',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'GANDHINAGAR',        'GANDHINAGAR',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'GANDHI NAGAR',       'GANDHINAGAR',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'DILSHADGARDEN',      'DILSHADGARDEN',      'Shahdara Zone'),
  (gen_random_uuid()::text, 'DILSHAD GARDEN',     'DILSHADGARDEN',      'Shahdara Zone'),
  (gen_random_uuid()::text, 'ANANDVIHAR',         'ANANDVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'ANAND VIHAR',        'ANANDVIHAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'VINODNAGAR',         'VINODNAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'VINOD NAGAR',        'VINODNAGAR',         'Shahdara Zone'),
  (gen_random_uuid()::text, 'GEETACOLONY',        'GEETACOLONY',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'GEETA COLONY',       'GEETACOLONY',        'Shahdara Zone'),
  (gen_random_uuid()::text, 'KARAWALNAGAR',       'KARAWALNAGAR',       'Shahdara Zone'),
  (gen_random_uuid()::text, 'KARAWAL NAGAR',      'KARAWALNAGAR',       'Shahdara Zone'),
  (gen_random_uuid()::text, 'NARELA',             'NARELA',             'Narela Zone'),
  (gen_random_uuid()::text, 'BAWANA',             'BAWANA',             'Narela Zone'),
  (gen_random_uuid()::text, 'NAJAFGARH',          'NAJAFGARH',          'Najafgarh Zone')
ON CONFLICT ("alias") DO NOTHING;
