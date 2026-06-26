/**
 * Address Normalizer — Property Identity Engine
 *
 * Converts a messy Indian address string into structured components.
 * All matching operates on NormalizedAddress fields — never on raw strings.
 *
 * Pipeline:
 *   raw string
 *     → expand abbreviations
 *     → extract identifiers (block, plot, house, khasra, pocket, sector)
 *     → synthesize compound codes  (BT-57, A-8)
 *     → resolve canonical locality via alias table
 *     → infer MCD zone
 *     → build search tokens for pg_trgm retrieval
 */

export interface NormalizedAddress {
  // Property identifiers
  houseNo: string | null       // "24", "24-B", "234"
  plotNo:  string | null       // "57", "812/4"
  block:   string | null       // "BT", "C", "RZ"
  pocket:  string | null       // "A", "B", "3"
  sector:  number | null       // 8, 12, 63
  phase:   number | null       // 1, 2, 3
  khasra:  string | null       // "812/4", "1213"
  flatNo:  string | null       // "7", "24-B"

  // Location hierarchy
  locality:    string | null   // canonical: "SHALIMARBAGH", "KAROLBAGH"
  subLocality: string | null   // "PART 2", "EXTENSION"
  city:        string | null   // "DELHI", "GURUGRAM"
  zone:        string | null   // "Keshavpuram Zone"
  pincode:     string | null   // "110088"

  // Synthesized compound identifiers (most discriminative signals)
  blockPlotCode:     string | null  // "BT-57"
  pocketSectorCode:  string | null  // "A-8"

  // Search tokens for pg_trgm candidate retrieval
  tokens: string[]

  // Single canonical representation
  canonical: string

  // Geographic flag
  isDelhi: boolean
}

// ── Abbreviation expansion ────────────────────────────────────────────────────

const ABBREV: Array<[RegExp, string]> = [
  [/\bBLK\.?\b/gi,                 'BLOCK '],
  [/\bSECT?\.?\s*(?=\s*\d)/gi,     'SECTOR '],
  [/\bPKT\.?\b/gi,                 'POCKET '],
  [/\bH\.?\s*NO\.?\s*/gi,          'HNO '],
  [/\bPL\.?\s*NO\.?\s*/gi,         'PLOT '],
  [/\bKH\.?\s*NO\.?\s*/gi,         'KHASRA '],
  [/\bPLOT\s+NO\.?\s*/gi,         'PLOT '],
  [/\bKHASRA\s+NO\.?\s*/gi,       'KHASRA '],
  [/\bSURVEY\s+NO\.?\s*/gi,       'SURVEY '],
  [/\bHOUSE\s+NO\.?\s*/gi,        'HNO '],
  [/\bSHOP\s+NO\.?\s*/gi,         'SHOP '],
  [/\bFLAT\s+NO\.?\s*/gi,         'FLAT '],
  [/\bDOOR\s+NO\.?\s*/gi,         'HNO '],
  [/\bUNIT\s+NO\.?\s*/gi,         'FLAT '],
  [/\bGATA\s+NO\.?\s*/gi,         'KHASRA '],
  [/\bKHATA\s+NO\.?\s*/gi,        'KHASRA '],
  [/\bEXTN\.?\b/gi,               'EXTENSION'],
  [/\bMKT\.?\b/gi,                'MARKET'],
  [/\bPASCHIMI\b/gi,              'WEST'],
  [/\bPOORVI\b/gi,                'EAST'],
  [/\bUTTARI\b/gi,                'NORTH'],
  [/\bDAKSHINI\b/gi,              'SOUTH'],
  [/[–—‒]/g,       '-'],   // em/en dashes
  [/[^\x00-\x7F]/g,               ' '],   // strip non-ASCII (Devanagari etc.)
];

function expandAbbreviations(raw: string): string {
  let s = raw.toUpperCase();
  for (const [re, rep] of ABBREV) s = s.replace(re, rep);
  return s.replace(/\s+/g, ' ').trim();
}

// ── Extractor helpers ─────────────────────────────────────────────────────────

function extractBlock(upper: string): string | null {
  // "Block BT", "BLK C", "RZ", "GH", "A" in compound like "A-8"
  const m1 = upper.match(/\bBLOCK\s+([A-Z]{1,4})\b/);
  if (m1) return m1[1];
  // Compact DB-style: "BT-57", "RZ-11" — block is the letter prefix
  const m2 = upper.match(/\b([A-Z]{1,4})-\d/);
  if (m2 && !['THE', 'NEW', 'AND', 'DDA', 'MCD', 'HNO', 'KH'].includes(m2[1])) return m2[1];
  return null;
}

function extractPlot(upper: string): string | null {
  // Keyword-prefixed
  const m1 = upper.match(/\bPLOT\s+(\d+(?:[\/\-]\d+)?(?:[\/\-][A-Z\d]+)?)\b/);
  if (m1) return m1[1];
  // Compact block-plot code sub-number: "BT-57" → "57"
  const m2 = upper.match(/\b[A-Z]{1,4}-(\d+[A-Z]?(?:[\/\-]\d+)?)\b/);
  if (m2) return m2[1].split(/[-\/]/)[0];
  return null;
}

function extractHouseNo(upper: string): string | null {
  const m = upper.match(/\bHNO\s+(\d+(?:[\/\-][A-Z\d]+)?)\b/);
  if (m) return m[1];
  // Digit-letter suffix: "24-B", "234-C"
  const m2 = upper.match(/\b(\d{1,5})-([A-Z])\b/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
}

function extractKhasra(upper: string): string | null {
  const m = upper.match(/\bKHASRA\s+(\d+(?:[\/\-]\d+)?)\b/);
  return m ? m[1] : null;
}

function extractPocket(upper: string): string | null {
  const m = upper.match(/\bPOCKET\s*-?\s*([A-Z\d]+)\b/);
  return m ? m[1] : null;
}

function extractSector(upper: string): number | null {
  const m = upper.match(/\bSECTOR\s*-?\s*(\d+)\b/);
  return m ? parseInt(m[1], 10) : null;
}

function extractPhase(upper: string): number | null {
  const m = upper.match(/\bPHASE\s*-?\s*(\d+|[IVX]+)\b/);
  if (!m) return null;
  const rn: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  return rn[m[1]] ?? parseInt(m[1], 10) ?? null;
}

function extractFlat(upper: string): string | null {
  const m = upper.match(/\bFLAT\s+(\d+[A-Z]?(?:[\/\-]\d+)?)\b/);
  return m ? m[1] : null;
}

// ── Locality resolution via alias map ────────────────────────────────────────

// Two-word locality patterns: returns canonical slug
const TWO_WORD: Array<[RegExp, string]> = [
  [/\bSHALIMAR\s+BAGH\b/,        'SHALIMARBAGH'],
  [/\bASHOK\s+VIHAR\b/,          'ASHOKVIHAR'],
  [/\bASHOK\s+NAGAR\b/,          'ASHOKNAGAR'],
  [/\bNEW\s+ASHOK\s+NAGAR\b/,    'NEWASHOKNAGAR'],
  [/\bKIRTI\s+NAGAR\b/,          'KIRTINAGAR'],
  [/\bRANI\s+BAGH\b/,            'RANIBAGH'],
  [/\bPITAM\s+PURA\b/,           'PITAMPURA'],
  [/\bKAROL\s+BAGH\b/,           'KAROLBAGH'],
  [/\bPATEL\s+NAGAR\b/,          'PATELNAGAR'],
  [/\bRAJA\s+GARDEN\b/,          'RAJAGARDEN'],
  [/\bRAJOURI\s+GARDEN\b/,       'RAJOURIGARDEN'],
  [/\bPASCHIM\s+VIHAR\b/,        'PASCHIMVIHAR'],
  [/\bJANAK\s+PURI\b/,           'JANAKPURI'],
  [/\bVIKAS\s+PURI\b/,           'VIKASPURI'],
  [/\bUTTAM\s+NAGAR\b/,          'UTTAMNAGAR'],
  [/\bLAJPAT\s+NAGAR\b/,         'LAJPATNAGAR'],
  [/\bSARITA\s+VIHAR\b/,         'SARITAVIHAR'],
  [/\bMALVIYA\s+NAGAR\b/,        'MALVIYANAGAR'],
  [/\bGREATER\s+KAILASH\b/,      'GREATERKAILASH'],
  [/\bHAUZ\s+KHAS\b/,            'HAUZKHAS'],
  [/\bVASANT\s+KUNJ\b/,          'VASANTKUNJ'],
  [/\bVASANT\s+VIHAR\b/,         'VASANTVIHAR'],
  [/\bMAYUR\s+VIHAR\b/,          'MAYURVIHAR'],
  [/\bPREET\s+VIHAR\b/,          'PREETVIHAR'],
  [/\bANAND\s+VIHAR\b/,          'ANANDVIHAR'],
  [/\bYAMUNA\s+VIHAR\b/,         'YAMUNAVIHAR'],
  [/\bGANDHI\s+NAGAR\b/,         'GANDHINAGAR'],
  [/\bGEETA\s+COLONY\b/,         'GEETACOLONY'],
  [/\bLAXMI\s+NAGAR\b/,          'LAXMINAGAR'],
  [/\bDILSHAD\s+GARDEN\b/,       'DILSHADGARDEN'],
  [/\bKARAWAL\s+NAGAR\b/,        'KARAWALNAGAR'],
  [/\bBHAJAN\s+PURA\b/,          'BHAJANPURA'],
  [/\bSHASTRI\s+NAGAR\b/,        'SHASTRINAGAR'],
  [/\bSHASTRI\s+PARK\b/,         'SHASTRIPARK'],
  [/\bMANGOL\s+PURI\b/,          'MANGOLPURI'],
  [/\bSULTAN\s+PURI\b/,          'SULTANPURI'],
  [/\bTAGORE\s+GARDEN\b/,        'TAGOREGARDEN'],
  [/\bVINOD\s+NAGAR\b/,          'VINODNAGAR'],
  [/\bPATAP\s*GANJ\b/,           'PATPARGANJ'],
  [/\bPATEL\s+NAGAR\b/,          'PATELNAGAR'],
  [/\bFRIENDS\s+COLONY\b/,       'FRIENDSCOLONY'],
  [/\bEAST\s+OF\s+KAILASH\b/,    'EASTOFKAILASH'],
];

/** Canonical locality → MCD zone */
const LOCALITY_TO_ZONE: Record<string, string> = {
  SHALIMARBAGH:   'Keshavpuram Zone', KIRTINAGAR:      'Keshavpuram Zone',
  ASHOKVIHAR:     'Keshavpuram Zone', RANIBAGH:        'Keshavpuram Zone',
  PITAMPURA:      'Rohini Zone',      ROHINI:          'Rohini Zone',
  MANGOLPURI:     'Rohini Zone',      SULTANPURI:      'Rohini Zone',
  BADLI:          'Rohini Zone',      TAGOREGARDEN:    'Rohini Zone',
  KAROLBAGH:      'Central Zone',     PATELNAGAR:      'Central Zone',
  SHASTRINAGAR:   'Central Zone',     SHASTRIPARK:     'Central Zone',
  PASCHIMVIHAR:   'West Zone',        JANAKPURI:       'West Zone',
  VIKASPURI:      'West Zone',        UTTAMNAGAR:      'West Zone',
  RAJAGARDEN:     'West Zone',        RAJOURIGARDEN:   'West Zone',
  DWARKA:         'South Zone',       VASANTKUNJ:      'South Zone',
  HAUZKHAS:       'South Zone',       SAKET:           'South Zone',
  LAJPATNAGAR:    'South Zone',       SARITAVIHAR:     'South Zone',
  MALVIYANAGAR:   'South Zone',       GREATERKAILASH:  'South Zone',
  JANGPURA:       'South Zone',       VASANTVIHAR:     'South Zone',
  OKHLA:          'South Zone',       MEHRAULI:        'South Zone',
  EASTOFKAILASH:  'South Zone',       FRIENDSCOLONY:   'South Zone',
  MAYURVIHAR:     'Shahdara Zone',    PREETVIHAR:      'Shahdara Zone',
  SHAHDARA:       'Shahdara Zone',    LAXMINAGAR:      'Shahdara Zone',
  PATPARGANJ:     'Shahdara Zone',    KONDLI:          'Shahdara Zone',
  YAMUNAVIHAR:    'Shahdara Zone',    BHAJANPURA:      'Shahdara Zone',
  GANDHINAGAR:    'Shahdara Zone',    DILSHADGARDEN:   'Shahdara Zone',
  ANANDVIHAR:     'Shahdara Zone',    VINODNAGAR:      'Shahdara Zone',
  GEETACOLONY:    'Shahdara Zone',    NEWASHOKNAGAR:   'Shahdara Zone',
  ASHOKNAGAR:     'Shahdara Zone',    KARAWALNAGAR:    'Shahdara Zone',
  NARELA:         'Narela Zone',      BAWANA:          'Narela Zone',
  ALIAPUR:        'Narela Zone',      NAJAFGARH:       'Najafgarh Zone',
};

const ZONE_KEYWORDS: Record<string, string> = {
  KESHAVPURAM: 'Keshavpuram Zone', ROHINI:   'Rohini Zone',
  NARELA:      'Narela Zone',      NAJAFGARH: 'Najafgarh Zone',
  SHAHDARA:    'Shahdara Zone',    CIVIL:     'Civil Lines Zone',
  SOUTH:       'South Zone',       CENTRAL:   'Central Zone',
  NORTH:       'North Zone',       WEST:      'West Zone',
};

function extractLocality(upper: string, aliases: Map<string, string>): string | null {
  // 1. Two-word canonical patterns (highest precision)
  for (const [re, canonical] of TWO_WORD) {
    if (re.test(upper)) return canonical;
  }
  // 2. DB-loaded aliases (admin-managed)
  const words = upper.split(/\s+/);
  for (const word of words) {
    const a = aliases.get(word);
    if (a) return a;
  }
  // 3. Direct match of known canonical names
  for (const canonical of Object.keys(LOCALITY_TO_ZONE)) {
    if (upper.includes(canonical)) return canonical;
  }
  return null;
}

function inferZone(locality: string | null, upper: string): string | null {
  if (locality) {
    const z = LOCALITY_TO_ZONE[locality];
    if (z) return z;
  }
  for (const [kw, zone] of Object.entries(ZONE_KEYWORDS)) {
    if (upper.includes(kw)) return zone;
  }
  return null;
}

// ── Non-Delhi guard ───────────────────────────────────────────────────────────

const NON_DELHI_CITIES = new Set([
  'GURUGRAM', 'GURGAON', 'NOIDA', 'GREATER NOIDA', 'GHAZIABAD', 'FARIDABAD',
  'MANESAR', 'SONIPAT', 'PALWAL', 'REWARI', 'BHIWADI', 'BAHADURGARH',
  'MUMBAI', 'BANGALORE', 'BENGALURU', 'CHENNAI', 'HYDERABAD', 'PUNE',
  'KOLKATA', 'AHMEDABAD', 'SURAT', 'JAIPUR', 'LUCKNOW', 'PATNA',
  'BHOPAL', 'INDORE', 'NAGPUR', 'CHANDIGARH', 'LUDHIANA', 'AMRITSAR',
  'AGRA', 'MEERUT', 'ALLAHABAD', 'PRAYAGRAJ', 'KANPUR', 'VARANASI',
  'DEHRADUN', 'HARIDWAR', 'RANCHI', 'RAIPUR', 'COIMBATORE', 'KOCHI',
]);

const NON_DELHI_STATES = [
  'HARYANA', 'UTTAR PRADESH', 'RAJASTHAN', 'MAHARASHTRA', 'KARNATAKA',
  'TAMIL NADU', 'TELANGANA', 'ANDHRA PRADESH', 'GUJARAT', 'PUNJAB',
  'WEST BENGAL', 'MADHYA PRADESH', 'UTTARAKHAND', 'JHARKHAND',
  'CHHATTISGARH', 'KERALA', 'ODISHA', 'ASSAM', 'BIHAR',
];

export function isNonDelhiAddress(raw: string): boolean {
  const upper = raw.toUpperCase();
  const pin = upper.match(/\b(\d{6})\b/)?.[1];
  if (pin && !pin.startsWith('11')) return true;
  for (const city of NON_DELHI_CITIES) {
    if (upper.includes(city)) return true;
  }
  for (const state of NON_DELHI_STATES) {
    if (upper.includes(state)) return true;
  }
  if (/\bHARYANA\b/.test(upper) || /[\s,\-]HR[\s,\-]/.test(upper)) return true;
  return false;
}

// ── Search token builder ──────────────────────────────────────────────────────

const TOKEN_STOP = new Set([
  'THE', 'AND', 'OF', 'AT', 'IN', 'ON', 'TO', 'FOR', 'NEAR', 'OPP',
  'FLOOR', 'GROUND', 'FIRST', 'SECOND', 'THIRD', 'UPPER', 'LOWER',
  'MIG', 'LIG', 'EWS', 'DDA', 'NEW', 'DELHI', 'NCR', 'INDIA',
  'ZONE', 'ROAD', 'MARG', 'GALI', 'LANE', 'STATE', 'LATE', 'SON',
]);

function buildSearchTokens(n: Partial<NormalizedAddress>): string[] {
  const toks = new Set<string>();
  if (n.blockPlotCode)    toks.add(n.blockPlotCode);
  if (n.pocketSectorCode) toks.add(n.pocketSectorCode);
  if (n.locality)         toks.add(n.locality);
  if (n.block)            toks.add(n.block);
  if (n.plotNo)           toks.add(n.plotNo);
  if (n.houseNo)          toks.add(n.houseNo);
  if (n.khasra)           toks.add(n.khasra);
  if (n.pincode)          toks.add(n.pincode);
  if (n.sector != null)   toks.add(String(n.sector));
  return [...toks].filter(Boolean).slice(0, 12);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function normalizeAddress(
  raw: string,
  aliases: Map<string, string> = new Map(),
): NormalizedAddress {
  const upper = expandAbbreviations(raw);

  const block   = extractBlock(upper);
  const plotNo  = extractPlot(upper);
  const houseNo = extractHouseNo(upper);
  const khasra  = extractKhasra(upper);
  const pocket  = extractPocket(upper);
  const sector  = extractSector(upper);
  const phase   = extractPhase(upper);
  const flatNo  = extractFlat(upper);
  const pincode = upper.match(/\b(\d{6})\b/)?.[1] ?? null;

  const blockPlotCode    = block && plotNo ? `${block}-${plotNo}` : null;
  const pocketSectorCode = pocket && sector != null ? `${pocket}-${sector}` : null;

  const locality = extractLocality(upper, aliases);
  const zone     = inferZone(locality, upper);

  const isDelhi = !isNonDelhiAddress(raw);
  const city    = isDelhi ? 'DELHI' : null;

  const partial: Partial<NormalizedAddress> = {
    block, plotNo, houseNo, khasra, locality,
    blockPlotCode, pocketSectorCode, pincode, sector,
  };
  const tokens = buildSearchTokens(partial);

  const parts: string[] = [];
  if (blockPlotCode)    parts.push(blockPlotCode);
  else if (block)       parts.push(block);
  if (locality)         parts.push(locality);
  if (zone)             parts.push(zone);
  const canonical = parts.join(' ').trim() || upper.slice(0, 60);

  return {
    houseNo: houseNo ?? null,
    plotNo,
    block,
    pocket,
    sector,
    phase,
    khasra,
    flatNo,
    locality,
    subLocality: null,
    city,
    zone,
    pincode,
    blockPlotCode,
    pocketSectorCode,
    tokens,
    canonical,
    isDelhi,
  };
}
