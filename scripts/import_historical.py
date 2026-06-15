#!/usr/bin/env python3
"""
Import historical case data from the old MIS Excel report into APLOMB database.
"""

import xlrd
import psycopg2
from psycopg2.extras import execute_values
import re
import time, random, string
from datetime import datetime

XLS_PATH = "/Users/gavikothari/Desktop/saa-s-dashboard-ui/downloaded_report (70).xls"
DB_URL   = "postgresql://neondb_owner:npg_nulK56mjPFga@ep-wild-silence-atatxihx.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"

# ── Tiny cuid-like IDs ─────────────────────────────────────────────────────
def cuid():
    ts   = format(int(time.time() * 1000), 'x')
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    return f"c{ts}{rand}"

# ── Parsers ────────────────────────────────────────────────────────────────
def parse_date(val):
    if not val or str(val).strip() in ('', 'N/A', 'NA', '0'):
        return None
    s = str(val).strip()
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return None

def parse_money(val):
    if not val:
        return None
    s = re.sub(r'[Rs.,\s]', '', str(val).strip())
    try:
        f = float(s)
        return f if f > 0 else None
    except ValueError:
        return None

def parse_coords(val):
    if not val or str(val).strip() in ('', 'N/A', 'NA'):
        return None, None
    parts = str(val).strip().split(',')
    if len(parts) == 2:
        try:
            return float(parts[0].strip()), float(parts[1].strip())
        except ValueError:
            pass
    return None, None

def map_status(s):
    return {
        'Completed':           'SENT_TO_BANK',
        'Sent for Review':     'UNDER_VERIFICATION',
        'Sent for Approval':   'UNDER_VERIFICATION',
        'Report Preparation':  'SITE_VISIT_COMPLETED',
        'Appointment Fixed':   'SITE_VISIT_SCHEDULED',
        'Could not assign':    'NEW',
        'Yet to Assign':       'NEW',
        'Deleted':             'CLOSED',
        'Loan Cancelled':      'CLOSED',
    }.get(str(s).strip(), 'CLOSED')

def map_property_type(t):
    low = str(t).strip().lower()
    if any(x in low for x in ['row house', 'individual house', 'builder floor', 'developer floor']):
        return 'RESIDENTIAL_INDEPENDENT'
    if any(x in low for x in ['developer flat', 'builder flat', 'authority flat',
                               'affordable flat', ' flat', 'apf project']):
        return 'RESIDENTIAL_APARTMENT'
    if 'flat' in low:
        return 'RESIDENTIAL_APARTMENT'
    if 'villa' in low:
        return 'RESIDENTIAL_VILLA'
    if any(x in low for x in ['vacant', 'plot', 'land']):
        return 'RESIDENTIAL_PLOT'
    if any(x in low for x in ['shop', 'retail']):
        return 'COMMERCIAL_RETAIL'
    if any(x in low for x in ['office', 'commercial']):
        return 'COMMERCIAL_OFFICE'
    if any(x in low for x in ['warehouse', 'storage']):
        return 'COMMERCIAL_WAREHOUSE'
    if any(x in low for x in ['industrial', 'factory']):
        return 'INDUSTRIAL'
    if any(x in low for x in ['agri', 'farm']):
        return 'AGRICULTURAL'
    return 'RESIDENTIAL_INDEPENDENT'

def map_case_type(lt, pt):
    l = str(lt).strip().lower()
    if 'self construction' in l:  return 'Self Construction'
    if 'balance transfer' in l:   return 'Balance Transfer'
    if 'lap' in l or 'loan against' in l: return 'LAP'
    if 'commercial' in str(pt).lower():   return 'Commercial Valuation'
    return 'Home Loan'

def classify_org(name):
    n = name.lower()
    if any(x in n for x in ['housing finance', 'home finance', 'hfc']): return 'HFC'
    if 'bank' in n: return 'BANK'
    if any(x in n for x in ['finance', 'capital', 'lending', 'infoline']): return 'NBFC'
    return 'BANK'

def branch_city_state(branch):
    m = {
        'Gurgaon':('Gurugram','Haryana'), 'Noida':('Noida','Uttar Pradesh'),
        'Indore':('Indore','Madhya Pradesh'), 'Faridabad':('Faridabad','Haryana'),
        'North Delhi':('Delhi','Delhi'), 'West Delhi':('Delhi','Delhi'),
        'East Delhi':('Delhi','Delhi'), 'South Delhi':('Delhi','Delhi'),
        'Central Delhi':('Delhi','Delhi'), 'Ghaziabad':('Ghaziabad','Uttar Pradesh'),
        'Sohna':('Sohna','Haryana'), 'Farukh Nagar':('Farukh Nagar','Haryana'),
        'Sonepat':('Sonipat','Haryana'), 'Bahadurgarh':('Bahadurgarh','Haryana'),
        'Palwal':('Palwal','Haryana'), 'Rewari':('Rewari','Haryana'),
    }
    return m.get(str(branch).strip(), (str(branch).strip() or 'Unknown', 'India'))

def clean(val, maxlen=255):
    if val is None: return None
    s = str(val).strip()
    return s[:maxlen] if s and s not in ('', 'N/A', 'NA', '0', 'nan') else None

def eng_email(name):
    slug = re.sub(r'[^a-z0-9]', '.', name.lower().strip())
    slug = re.sub(r'\.+', '.', slug).strip('.')
    return f"{slug}@aplomb.internal"

# ── Read Excel ─────────────────────────────────────────────────────────────
print("Reading Excel file...")
wb = xlrd.open_workbook(XLS_PATH)
sh = wb.sheet_by_name('Mis Report')
hdrs = [sh.cell_value(1, c) for c in range(sh.ncols)]
def col(name):
    try: return hdrs.index(name)
    except ValueError: return -1

rows = []
org_names, eng_names, exec_names = set(), set(), set()

for r in range(2, sh.nrows):
    def v(name):
        c = col(name)
        return sh.cell_value(r, c) if c >= 0 else ''
    d = dict(
        borrower      = v('Borrower Name'),
        client        = v('Client Name'),
        client_branch = v('Client Branch'),
        client_ref    = v('Client Ref#'),
        contact       = v('Customer Contact Number'),
        address       = v('Property Address'),
        address_site  = v('Address as per site'),
        loan_type     = v('Loan Type'),
        prop_type     = v('Property Type'),
        total_val     = v('Total Property Value'),
        realisable    = v('Realisable Value'),
        distressed    = v('Distressed Value'),
        branch        = v('Branch'),
        internal_ref  = v('Internal Ref#'),
        status        = v('Job Status'),
        posted_date   = v('Job Posted Date'),
        appt_date     = v('Appointment Date'),
        engineer      = v('Site Engineer'),
        visited_date  = v('Visited Date'),
        report_exec   = v('Report Executive'),
        report_type   = v('Report Type'),
        fees          = v('Fees'),
        coords        = v('Google Coordinate'),
        del_remarks   = v('Deleted Remarks'),
        dedupe        = v('Dedupe Case'),
        special_inst  = v('Special Instruction'),
        sno           = v('S.No'),
    )
    rows.append(d)
    if clean(d['client']):    org_names.add(clean(d['client']))
    if clean(d['engineer']):  eng_names.add(clean(d['engineer']))
    if clean(d['report_exec']): exec_names.add(clean(d['report_exec']))

print(f"  {len(rows)} rows | {len(org_names)} orgs | {len(eng_names)} engineers | {len(exec_names)} execs")

SYSTEM_USER_ID = "cmqf5578g0000nes16120qgca"  # system@aplomb.internal

# ── Connect ───────────────────────────────────────────────────────────────
print("\nConnecting to Neon...")
conn = psycopg2.connect(DB_URL)
conn.autocommit = False
cur = conn.cursor()

# ── 1. Organizations ──────────────────────────────────────────────────────
print("\n[1/3] Organizations...")
# Fetch existing
cur.execute('SELECT id, name FROM organizations')
org_id_map = {name: oid for oid, name in cur.fetchall()}

new_orgs = [(cuid(), n, classify_org(n)) for n in sorted(org_names) if n not in org_id_map]
if new_orgs:
    execute_values(cur, """
        INSERT INTO organizations (id, name, type, "isActive", "createdAt", "updatedAt")
        VALUES %s
    """, [(oid, n, t, True) for oid, n, t in new_orgs],
        template="(%s, %s, %s, %s, NOW(), NOW())")
    conn.commit()
    for oid, name, _ in new_orgs:
        org_id_map[name] = oid

print(f"  ✓ {len(org_id_map)} total orgs ({len(new_orgs)} new)")

# ── 2. Users (engineers + report execs) ──────────────────────────────────
print("\n[2/3] Users/Engineers...")
cur.execute('SELECT id, email FROM users')
user_by_email = {email: uid for uid, email in cur.fetchall()}
user_id_map = {}  # name → user id

all_staff = [(n, 'ENGINEER') for n in sorted(eng_names)]
all_staff += [(n, 'VERIFIER') for n in sorted(exec_names) if n not in eng_names]

new_users = []
for name, role in all_staff:
    email = eng_email(name)
    if email in user_by_email:
        user_id_map[name] = user_by_email[email]
    else:
        uid = cuid()
        new_users.append((uid, email, name, role))
        user_id_map[name] = uid
        user_by_email[email] = uid

if new_users:
    execute_values(cur, """
        INSERT INTO users (id, email, name, role, "isActive", "createdAt", "updatedAt")
        VALUES %s
        ON CONFLICT (email) DO NOTHING
    """, new_users, template="(%s, %s, %s, %s, true, NOW(), NOW())")
    conn.commit()

print(f"  ✓ {len(user_id_map)} users ({len(new_users)} new)")

# ── 3. Cases ──────────────────────────────────────────────────────────────
print("\n[3/3] Cases...")
cur.execute('SELECT "caseNumber" FROM cases')
existing_case_nums = {r[0] for r in cur.fetchall()}

batch, inserted, skipped = [], 0, 0

for row in rows:
    cn = clean(row['internal_ref'])
    if not cn:
        sno = row['sno']
        cn = f"APLOMB/HIST/{int(float(sno)) if sno else 0:06d}"

    if cn in existing_case_nums:
        skipped += 1
        continue
    existing_case_nums.add(cn)

    org_name = clean(row['client'])
    org_id = org_id_map.get(org_name)
    if not org_id:
        skipped += 1
        continue

    eng_name    = clean(row['engineer'])
    engineer_id = user_id_map.get(eng_name) if eng_name else None

    status    = map_status(row['status'])
    prop_type = map_property_type(row['prop_type'])
    case_type = map_case_type(row['loan_type'], row['prop_type'])

    created_at     = parse_date(row['posted_date']) or datetime.now()
    site_visit_dt  = parse_date(row['appt_date'])
    visited_dt     = parse_date(row['visited_date'])
    lat, lng       = parse_coords(row['coords'])

    address = clean(row['address']) or clean(row['address_site']) or 'Address not available'
    branch  = clean(row['branch']) or 'Unknown'
    city, state = branch_city_state(branch)

    contact = clean(str(row['contact'])[:20]) if row['contact'] else None
    if contact and not re.match(r'^[\d\s\+\-]+$', contact):
        contact = None

    is_dup = str(row['dedupe']).strip().lower() == 'yes'

    # Build notes with property value and other info
    notes_parts = []
    mv = parse_money(row['total_val'])
    rv = parse_money(row['realisable'])
    dv = parse_money(row['distressed'])
    if mv: notes_parts.append(f"Market Value: ₹{mv:,.0f}")
    if rv: notes_parts.append(f"Realisable: ₹{rv:,.0f}")
    if dv: notes_parts.append(f"Distressed: ₹{dv:,.0f}")
    if clean(row['special_inst']): notes_parts.append(f"Note: {clean(row['special_inst'])}")
    if clean(row['del_remarks']) and status == 'CLOSED':
        notes_parts.append(f"Closed: {clean(row['del_remarks'])}")
    if clean(row['report_type']): notes_parts.append(f"Report: {clean(row['report_type'])}")
    notes = ' | '.join(notes_parts) if notes_parts else None

    batch.append((
        cuid(),          # id
        cn,              # caseNumber
        org_id,          # organizationId
        case_type,       # caseType
        prop_type,       # propertyType
        'MEDIUM',        # priority
        status,          # status
        address,         # propertyAddress
        city,            # propertyCity
        state,           # propertyState
        '000000',        # propertyPincode
        lat,             # latitude
        lng,             # longitude
        clean(row['borrower']) or 'Unknown Owner',  # ownerName
        contact,                    # ownerContact
        clean(row['client_ref'], 100),  # loanAccountNumber
        clean(row['client_branch'], 100),  # branchName
        engineer_id,     # engineerId
        site_visit_dt,   # siteVisitDate
        visited_dt,      # siteVisitStartAt
        notes,           # notes
        is_dup,          # isDuplicate
        SYSTEM_USER_ID,  # createdById
        created_at,      # createdAt
        created_at,      # updatedAt
    ))

    if len(batch) >= 500:
        execute_values(cur, """
            INSERT INTO cases (
                id, "caseNumber", "organizationId", "caseType", "propertyType",
                priority, status,
                "propertyAddress", "propertyCity", "propertyState", "propertyPincode",
                latitude, longitude,
                "ownerName", "ownerContact",
                "loanAccountNumber", "branchName",
                "engineerId",
                "siteVisitDate", "siteVisitStartAt",
                notes, "isDuplicate", "createdById",
                "createdAt", "updatedAt"
            ) VALUES %s
            ON CONFLICT ("caseNumber") DO NOTHING
        """, batch)
        conn.commit()
        inserted += len(batch)
        print(f"  ... {inserted} inserted")
        batch = []

if batch:
    execute_values(cur, """
        INSERT INTO cases (
            id, "caseNumber", "organizationId", "caseType", "propertyType",
            priority, status,
            "propertyAddress", "propertyCity", "propertyState", "propertyPincode",
            latitude, longitude,
            "ownerName", "ownerContact",
            "loanAccountNumber", "branchName",
            "engineerId",
            "siteVisitDate", "siteVisitStartAt",
            notes, "isDuplicate", "createdById",
            "createdAt", "updatedAt"
        ) VALUES %s
        ON CONFLICT ("caseNumber") DO NOTHING
    """, batch)
    conn.commit()
    inserted += len(batch)

cur.close()
conn.close()

print(f"""
✅ Import complete
   Organizations : {len(org_id_map)}
   Users/Staff   : {len(user_id_map)}
   Cases inserted: {inserted}
   Cases skipped : {skipped}
""")
