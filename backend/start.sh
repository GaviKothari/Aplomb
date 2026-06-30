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

echo "[start] Running pending migrations..."
node_modules/.bin/prisma migrate deploy || true

echo "[start] Starting application..."
exec node dist/main
