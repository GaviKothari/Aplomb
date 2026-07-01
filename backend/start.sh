#!/bin/sh
set -e

echo "[start] Running database setup..."

# Add UserRole enum values and new employee columns.
# Must run outside Prisma's transaction wrapper because PostgreSQL forbids
# ALTER TYPE ... ADD VALUE inside a transaction block.
node prisma/setup-enums.js

echo "[start] Resolving migration history..."

# Clear any failed/stale migration entries so migrate deploy runs cleanly.
node_modules/.bin/prisma migrate resolve --rolled-back 20260627000000_property_intelligence 2>/dev/null || true
node_modules/.bin/prisma migrate resolve --applied  20260630000000_employee_clerk_integration 2>/dev/null || true
# Un-apply so migrate deploy re-runs the corrected SQL (table was "valuation_reports",
# now fixed to "reports"). setup-enums.js also runs the same ALTERs as a fallback.
node_modules/.bin/prisma migrate resolve --rolled-back 20260701000000_property_type_to_string 2>/dev/null || true

node_modules/.bin/prisma migrate resolve --rolled-back 20260701000001_expand_road_width_precision 2>/dev/null || true
node_modules/.bin/prisma migrate resolve --rolled-back 20260701000002_property_records 2>/dev/null || true
echo "[start] Running pending migrations..."
node_modules/.bin/prisma migrate deploy || true

echo "[start] Starting application..."
exec node dist/main
