"""
Import banks (organizations) and their branches + contact persons from the
historical report Excel into Neon PostgreSQL.

Columns used:
  col 2  — Client Name    (bank name)
  col 3  — Client Branch  (branch name)
  col 4  — Client Branch User Name (contact person)
  col 9  — Loan Type
  col 10 — Property Type
"""

import os
import xlrd
import psycopg2
from psycopg2.extras import execute_values

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_nulK56mjPFga@ep-wild-silence-atatxihx.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

EXCEL = "downloaded_report (70).xls"

# ── Read Excel ────────────────────────────────────────────────────────────────
print("Reading Excel…")
wb = xlrd.open_workbook(EXCEL)
ws = wb.sheet_by_index(0)

def clean(v):
    s = str(v).strip()
    return s if s not in ("", "nan", "0.0", "NA", "N/A", "None") else ""

# Collect: bank -> set of (branch, contact)
data = {}        # {bank_name: set of (branch, contact)}
loan_types = set()
prop_types = set()

for r in range(2, ws.nrows):
    bank    = clean(ws.cell_value(r, 2))
    branch  = clean(ws.cell_value(r, 3))
    contact = clean(ws.cell_value(r, 4))
    lt      = clean(ws.cell_value(r, 9))
    pt      = clean(ws.cell_value(r, 10))

    if bank:
        if bank not in data:
            data[bank] = set()
        if branch:
            data[bank].add((branch, contact))

    if lt:
        loan_types.add(lt)
    if pt:
        prop_types.add(pt)

print(f"  Banks: {len(data)}, unique branch records: {sum(len(v) for v in data.values())}")
print(f"  Loan types: {len(loan_types)}, Property types: {len(prop_types)}")

# ── Connect ───────────────────────────────────────────────────────────────────
conn = psycopg2.connect(DB_URL)
cur  = conn.cursor()

# ── Upsert organizations ──────────────────────────────────────────────────────
print("\nUpserting organizations (banks)…")
inserted_orgs = 0
org_id_map = {}  # bank_name -> org_id

for bank_name in sorted(data.keys()):
    cur.execute(
        """
        INSERT INTO organizations (id, name, type, "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, %s, 'BANK', true, NOW(), NOW())
        ON CONFLICT DO NOTHING
        """,
        (bank_name,)
    )
    if cur.rowcount:
        inserted_orgs += 1

    cur.execute("SELECT id FROM organizations WHERE name = %s LIMIT 1", (bank_name,))
    row = cur.fetchone()
    if row:
        org_id_map[bank_name] = row[0]

print(f"  {inserted_orgs} new organizations created, {len(org_id_map)} mapped")

# ── Insert BankBranch records ─────────────────────────────────────────────────
print("\nInserting bank branches…")
branch_rows = []
for bank_name, combos in data.items():
    org_id = org_id_map.get(bank_name)
    if not org_id:
        print(f"  WARN: no org ID for bank '{bank_name}', skipping")
        continue
    for (branch, contact) in combos:
        branch_rows.append((
            org_id,
            branch,
            contact or None,
        ))

execute_values(
    cur,
    """
    INSERT INTO bank_branches (id, "organizationId", "branchName", "contactName", "isActive", "createdAt", "updatedAt")
    VALUES %s
    ON CONFLICT ("organizationId", "branchName", "contactName") DO NOTHING
    """,
    [(r[0], r[1], r[2]) for r in branch_rows],
    template="(gen_random_uuid()::text, %s, %s, %s, true, NOW(), NOW())"
)

conn.commit()
print(f"  {len(branch_rows)} branch records processed")

# ── Print summary of unique loan/property types ───────────────────────────────
print("\n=== UNIQUE LOAN TYPES (for frontend CASE_TYPES array) ===")
for lt in sorted(loan_types):
    print(f"  '{lt}',")

print("\n=== UNIQUE PROPERTY TYPES (for frontend PROPERTY_TYPES array) ===")
for pt in sorted(prop_types):
    print(f"  '{pt}',")

cur.close()
conn.close()
print("\nDone ✓")
