#!/usr/bin/env python3
"""
Import MCD DEMOLITION LIST JUNE 2026.xlsx into demolition_properties table.
Run from: saa-s-dashboard-ui/  (project root)
"""
import openpyxl
import psycopg2
from psycopg2.extras import execute_values
import sys
import uuid
from datetime import datetime

DATABASE_URL = (
    "postgresql://neondb_owner:npg_nulK56mjPFga"
    "@ep-wild-silence-atatxihx.c-9.us-east-1.aws.neon.tech"
    "/neondb?sslmode=require"
)

ZONE_MAP = {
    'SOUTH ZONE':       'South Zone',
    'CENTRAL ZONE':     'Central Zone',
    'NORTH ZONE':       'North Zone',
    'WEST ZONE':        'West Zone',
    'ROHINI ZONE':      'Rohini Zone',
    'NARELA ZONE':      'Narela Zone',
    'KESHAVPURAM ZONE': 'Keshavpuram Zone',
    'NAJAFGARH ZONE':   'Najafgarh Zone',
    'SHAHDARA ZONE':    'Shahdara Zone',
    'BAGH ZONE':        'Shahdara Zone',
    'P ZONE':           'Shahdara Zone',
    'LINE ZONE':        'Shahdara Zone',
    'CIVIL LINE ZONE':  'Civil Lines Zone',
    'CIVIL LINES ZONE': 'Civil Lines Zone',
}

def extract_zone(address: str):
    upper = address.upper()
    for key, val in sorted(ZONE_MAP.items(), key=lambda x: -len(x[0])):
        if upper.strip().endswith(key):
            return val
    if upper.strip().endswith('ZONE'):
        return 'Other'
    return None

def extract_locality(address: str):
    upper = address.strip().upper()
    if 'ZONE' not in upper:
        return None
    zone_idx = upper.rfind(' ZONE')
    if zone_idx < 0:
        return None
    before = upper[:zone_idx].strip()
    # Address usually ends: "LOCALITY_SUBAREA LOCALITY ZONE_WORD ZONE"
    # e.g. "...  SARITA VIHAR SARITA VIHAR CENTRAL ZONE"
    # Take the last meaningful part before the zone name
    parts = before.split()
    if len(parts) >= 4:
        # Deduplicate: often "SARITA VIHAR SARITA VIHAR" — use unique last 2 words
        loc = ' '.join(parts[-2:])
        return loc[:100]
    return before[-100:] if before else None

def parse_date(d):
    if d is None:
        return None
    if isinstance(d, datetime):
        yr = d.year
        if yr < 2000 or yr > 2030:
            return None
        return d.date()
    s = str(d).strip()
    for fmt in ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
        try:
            dt = datetime.strptime(s, fmt)
            if 2000 <= dt.year <= 2030:
                return dt.date()
        except ValueError:
            pass
    return None

def main():
    print("Opening Excel file (this may take 30 sec for 125K rows)...")
    wb = openpyxl.load_workbook(
        'MCD DEMOLITION LIST JUNE 2026.xlsx',
        data_only=True,
        read_only=True,
    )
    ws = wb['Sheet1']

    print("Connecting to Neon database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM demolition_properties WHERE authority = 'MCD'")
    existing = cur.fetchone()[0]
    print(f"Existing MCD rows: {existing}")
    if existing > 120000:
        print("Already imported. Delete existing rows first to re-import.")
        cur.close()
        conn.close()
        return

    print("Processing and inserting rows in batches of 2000...")
    batch = []
    total_ok = 0
    total_skip = 0
    batch_num = 0

    for row in ws.iter_rows(min_row=6, values_only=True):
        if row[0] is None:
            continue

        booking_id  = str(row[1] or '').strip()[:50] or None
        file_number = str(row[2] or '').strip()[:200] or None
        owner_name  = str(row[3] or '').strip()[:500] or None
        address     = str(row[4] or '').strip()[:1000]
        notice_date = parse_date(row[5])

        if not address or not notice_date:
            total_skip += 1
            continue

        zone     = extract_zone(address)
        locality = extract_locality(address)

        batch.append((
            str(uuid.uuid4()),
            booking_id,
            'MCD',
            notice_date,
            file_number,
            address,
            'Delhi',
            zone,
            locality,
            owner_name,
            'ACTIVE',
            'MCD DEMOLITION LIST JUNE 2026.xlsx',
        ))
        total_ok += 1

        if len(batch) >= 2000:
            batch_num += 1
            execute_values(cur, """
                INSERT INTO demolition_properties
                  (id, "bookingId", authority, "noticeDate", "noticeNumber",
                   address, city, zone, locality, "ownerName",
                   status, "sourceFile")
                VALUES %s
                ON CONFLICT ("bookingId") DO NOTHING
            """, batch)
            conn.commit()
            batch = []
            print(f"  Batch {batch_num}: {total_ok} rows inserted so far...")
            sys.stdout.flush()

    if batch:
        execute_values(cur, """
            INSERT INTO demolition_properties
              (id, "bookingId", authority, "noticeDate", "noticeNumber",
               address, city, zone, locality, "ownerName",
               status, "sourceFile")
            VALUES %s
            ON CONFLICT ("bookingId") DO NOTHING
        """, batch)
        conn.commit()

    cur.close()
    conn.close()
    print(f"\nDone! Inserted: {total_ok}, Skipped: {total_skip}")

if __name__ == '__main__':
    main()
