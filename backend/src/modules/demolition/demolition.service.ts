/**
 * DemolitionService — property cross-match engine
 *
 * Handles 1.2 lakh MCD demolition records. Addresses arrive in two very
 * different formats:
 *
 *   Case (verbose):  "Plot No. 57, Second Floor, Block BT (Paschimi),
 *                     Shalimar Bagh, New Delhi – 110088"
 *   DB (compact):    "BT-57  Shalimar Bagh  Shalimar Bagh  KESHAVPURAM ZONE"
 *
 * The engine extracts multiple independent signals from each address and
 * scores candidate pairs. A single strong signal (compound code) is enough
 * for HIGH confidence; weaker signals accumulate to MEDIUM / LOW.
 *
 * PERFORMANCE NOTE FOR DBAs:
 *   With 1.2 lakh rows, adding a pg_trgm GIN index turns ILIKE '%X%' from a
 *   sequential scan into an index scan. Recommended migration:
 *
 *     CREATE EXTENSION IF NOT EXISTS pg_trgm;
 *     CREATE INDEX CONCURRENTLY idx_demolition_address_trgm
 *       ON demolition_properties USING GIN (address gin_trgm_ops);
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ─── Stop-word sets ──────────────────────────────────────────────────────────

/** For cross-match (matchCase): aggressive — keeps only area/locality words. */
const STOP = new Set([
  'NEW', 'DELHI', 'NCR', 'THE', 'AND', 'OF', 'AT', 'IN', 'ON', 'TO',
  'FOR', 'NEAR', 'OPP', 'OPPOSITE', 'ADJOINING', 'PART', 'NO', 'FLOOR',
  'GROUND', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'UPPER', 'LOWER',
  'FLAT', 'BLOCK', 'SECTOR', 'PHASE', 'POCKET', 'PLOT', 'HOUSE',
  'KHASRA', 'KHATA', 'GATA', 'SURVEY', 'DDA', 'MIG', 'LIG', 'EWS',
  'HIG', 'BPL', 'ZONE', 'ROAD', 'MARG', 'STREET', 'GALI', 'LANE',
  'MARKET', 'COLONY', 'EXTENSION', 'EXTN', 'NAGAR', 'VIHAR', 'VILLAGE',
  'VPO', 'POST', 'OFFICE', 'DISTRICT', 'DIST', 'STATE', 'INDIA',
  'FLOOR', 'STOREY', 'BUILDING', 'APARTMENT', 'APT', 'SOCIETY', 'SOC',
  'HOUSING', 'BOARD', 'AUTHORITY', 'PROJECT', 'SCHEME', 'FLATS',
  'LATE', 'SON', 'DAUGHTER', 'WIFE', 'WO', 'SO', 'DO',
]);

/** For live check (checkAddress): lighter — keeps KHASRA, PLOT, SECTOR, numbers. */
const LIGHT_STOP = new Set([
  'NEW', 'DELHI', 'NCR', 'THE', 'AND', 'OF', 'AT', 'IN', 'ON', 'TO',
  'FOR', 'NEAR', 'OPP', 'OPPOSITE', 'ADJOINING',
  'FLOOR', 'GROUND', 'FIRST', 'SECOND', 'THIRD', 'UPPER', 'LOWER',
  'MIG', 'LIG', 'EWS', 'HIG',
  'ZONE', 'ROAD', 'MARG', 'STREET', 'GALI', 'LANE',
  'STATE', 'INDIA', 'BUILDING', 'LATE', 'SON', 'DAUGHTER', 'WIFE',
  'WO', 'SO', 'DO',
]);

// ─── Roman numerals ──────────────────────────────────────────────────────────

const ROMAN_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
  IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15,
};

function romanToNumber(word: string): number | null {
  return ROMAN_MAP[word.toUpperCase()] ?? null;
}

// ─── Abbreviation expansion ──────────────────────────────────────────────────

/** Expand common Indian address abbreviations BEFORE any other processing. */
const ABBREV_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bBLK\.?\b/gi,               'BLOCK '],
  [/\bSECT?\.?\b(?=\s*[\d])/gi,  'SECTOR '],   // "Sec. 8" → "Sector 8"
  [/\bPKT\.?\b/gi,               'POCKET '],
  [/\bH\.?\s*NO\.?\s*/gi,        'HNO '],
  [/\bPL\.?\s*NO\.?\s*/gi,       'PLOT '],
  [/\bKH\.?\s*NO\.?\s*/gi,       'KHASRA '],
  [/\bSH\.?\s*NO\.?\s*/gi,       'SHOP '],
  [/\bF\.?\s*NO\.?\s*/gi,        'FLAT '],
  // Full-word "X No." forms that abbreviation rules don't catch
  [/\bPLOT\s+NO\.?\s*/gi,        'PLOT '],     // "Plot No. 57" → "PLOT 57"
  [/\bKHASRA\s+NO\.?\s*/gi,      'KHASRA '],   // "Khasra No. 812"
  [/\bSURVEY\s+NO\.?\s*/gi,      'SURVEY '],   // "Survey No. 45"
  [/\bHOUSE\s+NO\.?\s*/gi,       'HNO '],      // "House No. 234"
  [/\bSHOP\s+NO\.?\s*/gi,        'SHOP '],     // "Shop No. 5"
  [/\bFLAT\s+NO\.?\s*/gi,        'FLAT '],     // "Flat No. 7"
  [/\bGATA\s+NO\.?\s*/gi,        'GATA '],     // "Gata No. 123"
  [/\bKHATA\s+NO\.?\s*/gi,       'KHATA '],    // "Khata No. 45"
  [/\bDOOR\s+NO\.?\s*/gi,        'HNO '],      // "Door No. 23"
  [/\bUNIT\s+NO\.?\s*/gi,        'FLAT '],     // "Unit No. 4"
  [/\bSY\.?\s*NO\.?\s*/gi,       'SURVEY '],   // "Sy. No." (South India)
  [/\bRS\.?\s*NO\.?\s*/gi,       'SURVEY '],   // "RS No."
  [/\bW\.?\s*DELHI\b/gi,         'WEST DELHI'],
  [/\bN\.?\s*DELHI\b/gi,         'NORTH DELHI'],
  [/\bS\.?\s*DELHI\b/gi,         'SOUTH DELHI'],
  [/\bE\.?\s*DELHI\b/gi,         'EAST DELHI'],
  [/\bEXTN\.?\b/gi,              'EXTENSION'],
  [/\bVILG?\.?\b/gi,             'VILLAGE'],
  [/\bMKT\.?\b/gi,               'MARKET'],
  [/\bSOC\.?\b/gi,               'SOCIETY'],
  [/\bAWHO\b/gi,                 'ARMY'],
  [/\bRWA\b/gi,                  'RESIDENTS'],
  // Directional abbreviations
  [/\bPASCHIMI\b/gi,             'WEST'],
  [/\bPOORVI\b/gi,               'EAST'],
  [/\bUTTARI\b/gi,               'NORTH'],
  [/\bDAKSHINI\b/gi,             'SOUTH'],
];

function preProcess(raw: string): string {
  let s = raw.toUpperCase();
  for (const [re, rep] of ABBREV_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  return s.replace(/\s+/g, ' ').trim();
}

// ─── Two-word locality patterns ──────────────────────────────────────────────

const TWO_WORD_LOCALITIES: Array<[RegExp, string]> = [
  // North/West zones (Keshavpuram, Rohini, Narela, Civil Lines)
  [/\bSHALIMAR\s+BAGH\b/g,         'SHALIMARBAGH'],
  [/\bRANI\s+BAGH\b/g,              'RANIBAGH'],
  [/\bKIRTI\s+NAGAR\b/g,           'KIRTINAGAR'],
  [/\bASHOK\s+VIHAR\b/g,           'ASHOKVIHAR'],
  [/\bPITAM\s+PURA\b/g,            'PITAMPURA'],
  [/\bSHAKTI\s+NAGAR\b/g,          'SHAKTINAGAR'],
  [/\bSADAR\s+BAZAR\b/g,           'SADARBAZAR'],
  [/\bKAROL\s+BAGH\b/g,            'KAROLBAGH'],
  [/\bPATEL\s+NAGAR\b/g,           'PATELNAGAR'],
  [/\bRAJA\s+GARDEN\b/g,           'RAJAGARDEN'],
  [/\bRAJOURI\s+GARDEN\b/g,        'RAJOURIGARDEN'],
  [/\bPASCHIM\s+VIHAR\b/g,         'PASCHIMVIHAR'],
  [/\bSUBHASH\s+NAGAR\b/g,         'SUBHASHNAGAR'],
  [/\bTILAK\s+NAGAR\b/g,           'TILAKNAGAR'],
  [/\bJANAK\s+PURI\b/g,            'JANAKPURI'],
  [/\bVIKAS\s+PURI\b/g,            'VIKASPURI'],
  [/\bUTTAM\s+NAGAR\b/g,           'UTTAMNAGAR'],
  [/\bDWARKA\s+(?:SECTOR|SEC)/g,   'DWARKA'],
  // South/Central zones
  [/\bLAJPAT\s+NAGAR\b/g,          'LAJPATNAGAR'],
  [/\bSARITA\s+VIHAR\b/g,          'SARITAVIHAR'],
  [/\bMALVIYA\s+NAGAR\b/g,         'MALVIYANAGAR'],
  [/\bGREATER\s+KAILASH\b/g,       'GREATERKAILASH'],
  [/\bHAUZ\s+KHAS\b/g,             'HAUZKHAS'],
  [/\bVASANT\s+KUNJ\b/g,           'VASANTKUNJ'],
  [/\bVASANT\s+VIHAR\b/g,          'VASANTVIHAR'],
  [/\bSAKET\s+(?:NAGAR|DIST)\b/g,  'SAKET'],
  [/\bMEHRAULI\b/g,                'MEHRAULI'],
  [/\bOKHLA\b/g,                   'OKHLA'],
  // East/Shahdara zones
  [/\bMAYUR\s+VIHAR\b/g,           'MAYURVIHAR'],
  [/\bPREET\s+VIHAR\b/g,           'PREETVIHAR'],
  [/\bVINOD\s+NAGAR\b/g,           'VINODNAGAR'],
  [/\bMADHUR\s+VIHAR\b/g,          'MADHURVIHAR'],
  [/\bANAND\s+VIHAR\b/g,           'ANANDVIHAR'],
  [/\bYAMUNA\s+VIHAR\b/g,          'YAMUNAVIHAR'],
  [/\bGANDHI\s+NAGAR\b/g,          'GANDHINAGAR'],
  [/\bGEETA\s+COLONY\b/g,          'GEETACOLONY'],
  [/\bPATPAR\s*GANJ\b/g,           'PATPARGANJ'],
  [/\bLAXMI\s+NAGAR\b/g,           'LAXMINAGAR'],
  [/\bDILSHAD\s+GARDEN\b/g,        'DILSHADGARDEN'],
  [/\bVASUNDHARA\s+ENCLAVE\b/g,    'VASUNDHARAENCLAVE'],
  [/\bNEW\s+FRIENDS\s+COLONY\b/g,  'NEWFRIENDCOLONY'],
  [/\bFRIENDS\s+COLONY\b/g,        'FRIENDSCOLONY'],
  [/\bEAST\s+OF\s+KAILASH\b/g,     'EASTOFKAILASH'],
  [/\bJANGPURA\b/g,                'JANGPURA'],
  [/\bKONDLI\b/g,                  'KONDLI'],
  [/\bSHAHDARA\b/g,                'SHAHDARA'],
  [/\bKARAWAL\s+NAGAR\b/g,         'KARAWALNAGAR'],
  [/\bKARWAL\s+NAGAR\b/g,          'KARAWALNAGAR'],
  [/\bBHAJAN\s+PURA\b/g,           'BHAJANPURA'],
  [/\bSHASTRI\s+PARK\b/g,          'SHASTRIPARK'],
  [/\bSHASTRI\s+NAGAR\b/g,         'SHASTRINAGAR'],
  [/\bWELCOME\s+COLONY\b/g,        'WELCOMECOLONY'],
  // North/Narela zones
  [/\bNARELA\b/g,                  'NARELA'],
  [/\bBAWANA\b/g,                  'BAWANA'],
  [/\bALIAPUR\b/g,                 'ALIAPUR'],
  // Rohini zone
  [/\bROHINI\s+(?:SECTOR|SEC|EXT)\b/g, 'ROHINI'],
  [/\bMANGOL\s+PURI\b/g,           'MANGOLPURI'],
  [/\bSULTAN\s+PURI\b/g,           'SULTANPURI'],
  [/\bBADLI\b/g,                   'BADLI'],
  [/\bTAGORE\s+GARDEN\b/g,         'TAGOREGARDEN'],
  // Najafgarh zone
  [/\bNAJAFGARH\b/g,               'NAJAFGARH'],
  [/\bDWARKA\b/g,                  'DWARKA'],
  [/\bDICKSON\s+PURI\b/g,          'DICKSONPURI'],
];

// ─── Locality aliases ────────────────────────────────────────────────────────

const LOCALITY_ALIASES: Record<string, string> = {
  // North/Keshavpuram
  'SHALIMAR':    'SHALIMARBAGH',  'SHALIMARBAGH': 'SHALIMARBAGH',
  'RANIBAGH':    'RANIBAGH',      'RANI':         'RANIBAGH',
  'KIRTI':       'KIRTINAGAR',    'KIRTINAGAR':   'KIRTINAGAR',
  'ASHOK':       'ASHOKVIHAR',    'ASHOKVIHAR':   'ASHOKVIHAR',
  'PITAMPURA':   'PITAMPURA',     'PITAM':        'PITAMPURA',
  'SHAKTI':      'SHAKTINAGAR',
  'SADARBAZAR':  'SADARBAZAR',    'SADAR':        'SADARBAZAR',
  'KAROLBAGH':   'KAROLBAGH',     'KAROL':        'KAROLBAGH',
  'PATEL':       'PATELNAGAR',
  'RAJOURI':     'RAJOURIGARDEN', 'RAJORI':       'RAJOURIGARDEN',
  'PASCHIM':     'PASCHIMVIHAR',  'PASCHIMVIHAR': 'PASCHIMVIHAR',
  'SUBHASH':     'SUBHASHNAGAR',
  'TILAK':       'TILAKNAGAR',
  'JANAKPURI':   'JANAKPURI',     'JANAK':        'JANAKPURI',
  'VIKASPURI':   'VIKASPURI',     'VIKAS':        'VIKASPURI',
  'UTTAM':       'UTTAMNAGAR',    'UTTAMNAGAR':   'UTTAMNAGAR',
  // South/Central
  'LAJPAT':      'LAJPATNAGAR',   'LAJPATNAGAR':  'LAJPATNAGAR',
  'SARITA':      'SARITAVIHAR',   'SARITHA':      'SARITAVIHAR',
  'MALVIYA':     'MALVIYANAGAR',
  'HAUZKHAS':    'HAUZKHAS',      'HAUZ':         'HAUZKHAS',
  'VASANT':      'VASANTKUNJ',    'VASANTKUNJ':   'VASANTKUNJ',
  'VASANTVIHAR': 'VASANTVIHAR',
  'SAKET':       'SAKET',
  // East/Shahdara
  'MAYUR':       'MAYURVIHAR',    'MAYURVIHAR':   'MAYURVIHAR',
  'PREET':       'PREETVIHAR',    'PREETVIHAR':   'PREETVIHAR',
  'VINOD':       'VINODNAGAR',
  'ANAND':       'ANANDVIHAR',
  'YAMUNA':      'YAMUNAVIHAR',   'YAMUNAVIHAR':  'YAMUNAVIHAR',
  'GANDHI':      'GANDHINAGAR',
  'GEETA':       'GEETACOLONY',
  'PATPARGANJ':  'PATPARGANJ',
  'LAXMI':       'LAXMINAGAR',    'LAXMINAGAR':   'LAXMINAGAR',
  'KONDLI':         'KONDLI',
  'SHAHDARA':       'SHAHDARA',
  'DILSHAD':        'DILSHADGARDEN',   'DILSHADGARDEN':    'DILSHADGARDEN',
  'VASUNDHARA':     'VASUNDHARAENCLAVE',
  'JANGPURA':       'JANGPURA',
  'KARAWAL':        'KARAWALNAGAR',    'KARWAL':           'KARAWALNAGAR',
  'BHAJAN':         'BHAJANPURA',      'BHAJANPURA':       'BHAJANPURA',
  'SHASTRI':        'SHASTRINAGAR',
  // Rohini
  'ROHINI':      'ROHINI',
  'MANGOL':      'MANGOLPURI',    'MANGOLPURI':   'MANGOLPURI',
  'SULTAN':      'SULTANPURI',    'SULTANPURI':   'SULTANPURI',
  'TAGORE':      'TAGOREGARDEN',
  // Other
  'DWARKA':      'DWARKA',
  'NARELA':      'NARELA',
  'NAJAFGARH':   'NAJAFGARH',
  'BAWANA':      'BAWANA',
};

// ─── Zone inference ──────────────────────────────────────────────────────────

const ZONE_KEYWORDS: Record<string, string> = {
  'KESHAVPURAM': 'Keshavpuram Zone',
  'ROHINI':      'Rohini Zone',
  'NARELA':      'Narela Zone',
  'NAJAFGARH':   'Najafgarh Zone',
  'SHAHDARA':    'Shahdara Zone',
  'CIVIL':       'Civil Lines Zone',
  'SOUTH':       'South Zone',
  'CENTRAL':     'Central Zone',
  'NORTH':       'North Zone',
  'WEST':        'West Zone',
  'EAST':        'Shahdara Zone',   // "EAST ZONE" in MCD = Shahdara
};

// Locality → zone (for cross-check when neither address mentions a zone explicitly)
const LOCALITY_TO_ZONE: Record<string, string> = {
  'SHALIMARBAGH':  'Keshavpuram Zone',
  'KIRTINAGAR':    'Keshavpuram Zone',
  'ASHOKVIHAR':    'Keshavpuram Zone',
  'PITAMPURA':     'Rohini Zone',
  'ROHINI':        'Rohini Zone',
  'MANGOLPURI':    'Rohini Zone',
  'SULTANPURI':    'Rohini Zone',
  'KAROLBAGH':     'Central Zone',
  'PATELNAGAR':    'Central Zone',
  'SHASTRINAGAR':  'Central Zone',
  'PASCHIMVIHAR':  'West Zone',
  'JANAKPURI':     'West Zone',
  'VIKASPURI':     'West Zone',
  'UTTAMNAGAR':    'West Zone',
  'DWARKA':        'South Zone',
  'VASANTKUNJ':    'South Zone',
  'HAUZKHAS':      'South Zone',
  'SAKET':         'South Zone',
  'LAJPATNAGAR':   'South Zone',
  'SARITAVIHAR':   'South Zone',
  'MALVIYANAGAR':  'South Zone',
  'MAYURVIHAR':          'Shahdara Zone',
  'PREETVIHAR':          'Shahdara Zone',
  'SHAHDARA':            'Shahdara Zone',
  'LAXMINAGAR':          'Shahdara Zone',
  'PATPARGANJ':          'Shahdara Zone',
  'KONDLI':              'Shahdara Zone',
  'YAMUNAVIHAR':         'Shahdara Zone',
  'BHAJANPURA':          'Shahdara Zone',
  'GANDHINAGAR':         'Shahdara Zone',
  'DILSHADGARDEN':       'Shahdara Zone',
  'VASUNDHARAENCLAVE':   'Shahdara Zone',
  'JANGPURA':            'South Zone',
  'NARELA':        'Narela Zone',
  'BAWANA':        'Narela Zone',
  'NAJAFGARH':     'Najafgarh Zone',
};

// Parenthetical directional suffixes to strip from block names
const DIRECTION_SUFFIXES = new Set([
  'WEST', 'EAST', 'NORTH', 'SOUTH',
  'PASCHIMI', 'POORVI', 'UTTARI', 'DAKSHINI', 'DAKSHHINI',
]);

// ─── Core extraction functions ───────────────────────────────────────────────

/**
 * Generic tokeniser — strips stop-words and short/trivial tokens.
 * Used in matchCase() for broad locality-word overlap.
 */
function tokenise(address: string): string[] {
  const words = preProcess(address)
    .replace(/[^\w\s\/\-]/g, ' ')
    .split(/\s+/);
  return [...new Set(
    words.filter(w => {
      if (w.length < 3) return false;
      if (STOP.has(w)) return false;
      if (/^\d+$/.test(w) && w.length < 5) return false;
      return true;
    }),
  )].slice(0, 15);
}

/**
 * Lighter tokeniser for live checkAddress() — keeps more numeric and structural tokens.
 */
function lightTokenise(address: string): string[] {
  const words = preProcess(address)
    .replace(/[^\w\s\/\-]/g, ' ')
    .split(/\s+/);
  return [...new Set(
    words.filter(w => {
      if (w.length < 2) return false;
      if (LIGHT_STOP.has(w)) return false;
      if (/^\d+$/.test(w)) return w.length >= 2;
      return true;
    }),
  )].slice(0, 18);
}

/**
 * Extract ALL types of property identifiers:
 *   - Alphanumeric codes:  G-91, RZ-11C, BT-57, C-7/8
 *   - Keyword-prefixed:    Plot No. 57, H. No. 234, Khasra No. 812/4
 *   - Standalone numbers:  234, 812, 57  (2-6 digits)
 *   - Khasra fractions:    812/4, 1213/2/3 — kept intact AND base extracted
 */
function extractPlotNumbers(address: string): string[] {
  const upper = preProcess(address).replace(/[^\w\s\/\-\.]/g, ' ');
  const found = new Set<string>();

  // Letter-starting alphanumeric codes: "G-91", "RZ-11C", "BT-57", "M-24"
  for (const m of upper.matchAll(/\b([A-Z]{1,3}[-\/]\d+[A-Z]?(?:[-\/]\d+)?)\b/g))
    found.add(m[1]);

  // Digit-letter suffix codes: "24-B", "234-C", "57/A", "24/B-1"
  // Very common in DDA / MCD numbering (flat or house number with suffix)
  for (const m of upper.matchAll(/\b(\d{1,5}[-\/][A-Z]\d*(?:[-\/]\d+)?)\b/g)) {
    found.add(m[1]);
    found.add(m[1].split(/[-\/]/)[0]); // base number
  }

  // Keyword-prefixed numbers: "Plot No. 57", "H.No. 234", "Khasra 812/4", "Flat 24-B"
  for (const m of upper.matchAll(
    /(?:HNO|PLOT|KHASRA|KHATA|GATA|SURVEY|FLAT|SHOP|DOOR|UNIT)\s+(\d+(?:[\/\-]\d+)?(?:[\/\-][A-Z\d]+)?)/g,
  )) {
    found.add(m[1]);
    const base = m[1].split(/[\/\-]/)[0];
    if (base !== m[1]) found.add(base);
  }

  // Standalone 2-6 digit numbers (catches plot numbers without any prefix)
  for (const m of upper.matchAll(/\b(\d{2,6})\b/g)) {
    if (m[1].length <= 6) found.add(m[1]);
  }

  return [...found].slice(0, 18);
}

/**
 * Synthesise compound block-plot codes from addresses that spell out components
 * separately.
 *
 * Handles:
 *   "Block BT (Paschimi), Plot No. 57"         → ["BT-57"]
 *   "Block C, H. No. 234, Sector 12"           → ["C-234"]
 *   "RZ Block, Plot 45-B, Uttam Nagar"         → ["RZ-45"]
 *   "Block 12-A, Flat 7, DDA"                  → ["12-7"] (less common, still extracted)
 */
function extractBlockPlotCodes(address: string): string[] {
  const upper = preProcess(address)
    .replace(/\(([A-Z]+)\)/g, (_, w) => DIRECTION_SUFFIXES.has(w) ? ' ' : ` ${w} `)
    .replace(/[^\w\s\/\-]/g, ' ');
  const found = new Set<string>();

  // Decode compact DB-style codes: "BT-57", "RZ-11C", "GH-6-C" → compound codes directly.
  // MCD database records often omit "Block" / "Plot" keywords and use this shorthand.
  for (const m of upper.matchAll(/\b([A-Z]{1,4})-(\d+[A-Z]?(?:[-\/]\d+)?)\b/g)) {
    if (!DIRECTION_SUFFIXES.has(m[1])) {
      const pn = m[2];
      found.add(`${m[1]}-${pn}`);
      const base = pn.split(/[-\/]/)[0];
      if (base !== pn) found.add(`${m[1]}-${base}`);
    }
  }

  // Collect block identifiers (strip parenthetical direction words)
  const blocks: string[] = [];
  for (const m of upper.matchAll(/\bBLOCK\s+([A-Z]{1,4})\b/g)) {
    if (!DIRECTION_SUFFIXES.has(m[1])) blocks.push(m[1]);
  }

  // Collect plot / house numbers
  const plots: string[] = [];
  for (const m of upper.matchAll(
    /(?:PLOT|HNO|KHASRA)\s+(\d+(?:[\/\-]\d+)?(?:[\/\-][A-Z\d]+)?)/g,
  )) plots.push(m[1]);

  // If no explicit plot keyword, fall back to short standalone numbers in same address
  if (blocks.length > 0 && plots.length === 0) {
    for (const m of upper.matchAll(/\b(\d{1,4})\b/g)) {
      if (parseInt(m[1]) > 0) plots.push(m[1]);
    }
  }

  for (const b of blocks) {
    for (const p of plots) {
      found.add(`${b}-${p}`);
      const base = p.split(/[\/\-]/)[0];
      if (base !== p) found.add(`${b}-${base}`);
    }
  }

  return [...found].slice(0, 8);
}

/**
 * Synthesise Pocket + Sector compound codes.
 *
 * DDA housing patterns:
 *   "Pocket A, Sector 8, Dwarka"        → ["A-8"]
 *   "Flat F-56, Pocket B, Sector 12"    → ["B-12"]
 *   "Pocket-3, Sector-11, Rohini"       → ["3-11"]
 */
function extractPocketSectorCodes(address: string): string[] {
  const upper = preProcess(address).replace(/[^\w\s\-\/]/g, ' ');
  const found = new Set<string>();

  const pockets: string[] = [];
  // Handle "Pocket J & K", "Pocket J AND K", "Pocket J-K", "Pocket J"
  for (const m of upper.matchAll(/\bPOCKET\s*[-]?\s*([A-Z\d]+)(?:\s*(?:AND|&|\-)\s*([A-Z\d]+))?/g)) {
    pockets.push(m[1]);
    if (m[2]) pockets.push(m[2]);
  }

  const sectors: string[] = [];
  for (const m of upper.matchAll(/\bSECTOR\s*[-]?\s*(\d+)\b/g))
    sectors.push(m[1]);

  for (const p of pockets)
    for (const s of sectors)
      found.add(`${p}-${s}`);

  // "Flat X, Sector Y" (rare but present in DDA records)
  for (const m of upper.matchAll(/\bFLAT\s+([A-Z])\b.{1,40}?\bSECTOR\s+(\d+)\b/g))
    found.add(`${m[1]}-${m[2]}`);

  return [...found].slice(0, 6);
}

/**
 * Extract part / phase numbers from an address (used as disambiguation bonus
 * when the locality also matches).
 *
 * Patterns:
 *   "Lajpat Nagar Part-II"    → "2"
 *   "Lajpat Nagar-2"          → "2"
 *   "Phase III Extension"     → "3"
 *   "Extension-1"             → "1"
 */
function extractPartNumbers(address: string): string[] {
  const upper = preProcess(address).replace(/[^\w\s\-]/g, ' ');
  const found = new Set<string>();

  for (const m of upper.matchAll(
    /\b(?:PART|PHASE|EXT|EXTENSION)\s*[-]?\s*([IVX]+|\d+)\b/g,
  )) {
    const n = romanToNumber(m[1]);
    found.add(n !== null ? String(n) : m[1]);
  }

  // "NAGAR-2", "BAGH-1", "VIHAR-3" trailing numeral
  for (const m of upper.matchAll(
    /\b(?:NAGAR|BAGH|VIHAR|ENCLAVE|PARK|COLONY|MARG|ROAD)\s*[-]\s*(\d+|[IVX]+)\b/g,
  )) {
    const n = romanToNumber(m[1]);
    found.add(n !== null ? String(n) : m[1]);
  }

  return [...found].slice(0, 4);
}

/** Canonical two-word locality tokens (e.g. SHALIMARBAGH). */
function extractTwoWordLocalities(address: string): string[] {
  const upper = address.toUpperCase();
  const found: string[] = [];
  for (const [re, canonical] of TWO_WORD_LOCALITIES) {
    re.lastIndex = 0;
    if (re.test(upper)) found.push(canonical);
  }
  return found;
}

/** Build a set of canonical locality tokens from an address. */
function localityTokens(address: string): Set<string> {
  const upper = preProcess(address);
  const out = new Set<string>();

  for (const t of extractTwoWordLocalities(address)) out.add(t);

  for (const [variant, canonical] of Object.entries(LOCALITY_ALIASES)) {
    if (upper.includes(variant)) out.add(canonical);
  }

  for (const w of upper.replace(/[^\w\s]/g, ' ').split(/\s+/)) {
    if (w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w);
  }

  return out;
}

/** Infer MCD zone from address text + locality → zone mapping. */
function inferZone(address: string): string | null {
  const upper = preProcess(address);

  for (const [kw, zone] of Object.entries(ZONE_KEYWORDS)) {
    if (upper.includes(kw)) return zone;
  }

  // Fall back via locality tokens
  for (const loc of localityTokens(address)) {
    const z = LOCALITY_TO_ZONE[loc];
    if (z) return z;
  }

  return null;
}

/**
 * True when two plot / khasra identifiers refer to the same property.
 * "812" ≅ "812/4", "45" ≅ "45-B", "45" ≅ "45A"
 */
function plotCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const base = (s: string) => s.replace(/[\/\-][A-Z\d]+$/, '');
  const aBase = base(a);
  const bBase = base(b);
  return aBase === bBase || aBase === b || bBase === a;
}

/**
 * True when any compound code from `codes` appears as a token or substring
 * in `address` (handles both compact "BT-57" form and split "BT 57" form).
 */
function compoundCodeHit(codes: string[], address: string): boolean {
  if (codes.length === 0) return false;
  const upper = address.toUpperCase().replace(/[^\w\s\/\-]/g, ' ');
  const tokens = new Set(upper.split(/\s+/));
  const noSpace = upper.replace(/\s+/g, '');
  return codes.some(c => {
    if (tokens.has(c)) return true;
    if (noSpace.includes(c.replace(/\-/g, ''))) return true;
    // Also match space-separated form: code "BT-57" matches "BT 57" in DB address
    const parts = c.split('-');
    if (parts.length === 2 && /^[A-Z]+$/.test(parts[0]) && /^\d/.test(parts[1])) {
      const re = new RegExp(`\\b${parts[0]}\\s+${parts[1]}\\b`);
      if (re.test(upper)) return true;
    }
    return false;
  });
}

/** Token overlap between two sets (Jaccard numerator). */
function tokenOverlap(setA: Set<string>, setB: Set<string>): number {
  return [...setA].filter(t => setB.has(t)).length;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class DemolitionService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats & analytics ────────────────────────────────────────────────────────

  async getStats() {
    const [total, zoneRows, yearRows, recentAlerts, matchedCases] =
      await Promise.all([
        this.prisma.demolitionProperty.count(),
        this.prisma.$queryRaw<{ zone: string; count: bigint }[]>`
          SELECT zone, COUNT(*) AS count
          FROM demolition_properties
          WHERE zone IS NOT NULL
          GROUP BY zone
          ORDER BY count DESC
        `,
        this.prisma.$queryRaw<{ year: string; count: bigint }[]>`
          SELECT TO_CHAR("noticeDate", 'YYYY') AS year, COUNT(*) AS count
          FROM demolition_properties
          WHERE EXTRACT(YEAR FROM "noticeDate") BETWEEN 2007 AND 2026
          GROUP BY year
          ORDER BY year ASC
        `,
        this.prisma.demolitionAlert.count({
          where: { matchStatus: { not: 'DISMISSED' } },
        }),
        this.prisma.demolitionAlert.count({
          where: { matchStatus: 'CONFIRMED' },
        }),
      ]);

    return {
      total,
      matchedCases,
      recentAlerts,
      zones: zoneRows.map(r => ({ zone: r.zone, count: Number(r.count) })),
      yearTrend: yearRows.map(r => ({ year: r.year, count: Number(r.count) })),
    };
  }

  // ── List / search demolition properties ─────────────────────────────────────

  async findAll(query: {
    search?: string; zone?: string; page?: number; limit?: number;
  }) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const skip  = (page - 1) * limit;

    const where: Prisma.DemolitionPropertyWhereInput = {};
    if (query.zone && query.zone !== 'all') where.zone = query.zone;
    if (query.search) {
      where.OR = [
        { address:      { contains: query.search, mode: 'insensitive' } },
        { ownerName:    { contains: query.search, mode: 'insensitive' } },
        { noticeNumber: { contains: query.search, mode: 'insensitive' } },
        { locality:     { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.demolitionProperty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { noticeDate: 'desc' },
        select: {
          id: true, bookingId: true, noticeNumber: true, noticeDate: true,
          address: true, zone: true, locality: true, ownerName: true, status: true,
          _count: { select: { alerts: true } },
        },
      }),
      this.prisma.demolitionProperty.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Score a candidate pair ───────────────────────────────────────────────────
  //
  // Centralised scorer used by BOTH matchCase() and checkAddress().
  // Scores are additive and capped at 100.
  //
  //  Signal                           Max   Notes
  //  ──────────────────────────────  ────  ──────────────────────────────────
  //  Compound block-plot code         40   "Block BT + Plot 57" → "BT-57"
  //  Standalone alphanumeric code     35   "G-91", "RZ-11C" found in both
  //  Pocket + sector code             28   "Pocket A + Sector 8" → "A-8"
  //  Plot / house number (exact)      22   same number, prefix-compatible
  //  Plot / house number (partial)    12   base number match (812 ≅ 812/4)
  //  Two-word locality canonical      15   SHALIMARBAGH in both
  //  Single-word locality alias       8    SHALIMAR → SHALIMARBAGH
  //  Part / phase number bonus        8    "Part II" = "2" AND locality matches
  //  Owner name (last name)           10   distinctive surname token match
  //  Owner name (partial)             5    any name token match
  //  Zone inference                   6    same MCD zone (inferred or explicit)
  //  General token overlap            15   Jaccard of locality/area words

  private scoreAddressPair(
    caseAddr:  string,
    dbAddr:    string,
    caseOwner: string | null,
    dbOwner:   string | null,
    dbZone:    string | null,
  ): {
    score: number;
    reason: string;
    detail: Record<string, number | boolean | string[]>;
  } {
    const detail: Record<string, number | boolean | string[]> = {};

    // ── Prepare signals from both addresses ──
    const caseCompound  = extractBlockPlotCodes(caseAddr);
    const dbCompound    = extractBlockPlotCodes(dbAddr);
    const casePocket    = extractPocketSectorCodes(caseAddr);
    const dbPocket      = extractPocketSectorCodes(dbAddr);
    const casePlots     = extractPlotNumbers(caseAddr);
    const dbPlots       = extractPlotNumbers(dbAddr);
    const caseParts     = extractPartNumbers(caseAddr);
    const dbParts       = extractPartNumbers(dbAddr);
    const caseLocality  = localityTokens(caseAddr);
    const dbLocality    = localityTokens(dbAddr);
    const caseToks      = new Set(tokenise(caseAddr));
    const dbToks        = new Set(tokenise(dbAddr));
    const caseZone    = inferZone(caseAddr);
    // Prefer zone inferred from DB address TEXT over the stored zone field —
    // MCD raw data has significant zone classification errors (e.g., Karol Bagh
    // records stored under "Shahdara Zone"). Text inference is more reliable.
    const inferredDbZone  = inferZone(dbAddr);
    const effectiveDbZone = inferredDbZone ?? dbZone;

    // 1. Compound block-plot code (0-40)
    // Case: "Block BT + Plot 57" → "BT-57"; DB has "BT-57" as token → exact hit
    // Also handles DB entries that have compound codes that we can reverse-match
    const codeHit = compoundCodeHit(caseCompound, dbAddr)
                 || compoundCodeHit(dbCompound, caseAddr)
                 || (caseCompound.length > 0 && dbCompound.some(d => caseCompound.includes(d)));
    const codeScore = codeHit ? 40 : 0;
    detail.compoundCode = codeHit;
    detail.caseCompound = caseCompound;

    // 2. Standalone alphanumeric code (0-35)
    // Covers both LETTER-digit ("G-91", "BT-57") and digit-LETTER ("24-B", "234-C") formats.
    // Digit-letter suffix codes are very common in DDA/MCD flat numbering.
    const isAlphaNum = (p: string) =>
      (/^[A-Z]/.test(p) && /\d/.test(p)) || /^\d+[-\/][A-Z]/.test(p);
    const caseAlpha = casePlots.filter(isAlphaNum);
    const dbAlpha   = dbPlots.filter(isAlphaNum);
    const alphaHits = caseAlpha.filter(a => dbAlpha.some(d => plotCompatible(a, d)));
    // Also check if any case alpha code appears as token in DB and vice versa
    const alphaInDb  = caseAlpha.filter(a => compoundCodeHit([a], dbAddr));
    const alphaInCase = dbAlpha.filter(a => compoundCodeHit([a], caseAddr));
    const allAlphaHits = new Set([...alphaHits.map(h => h), ...alphaInDb, ...alphaInCase]);
    const alphaScore = Math.min(35, allAlphaHits.size * 35);
    detail.alphaCodeHits = [...allAlphaHits];

    // 3. Pocket + sector code (0-28)
    const pocketHits = casePocket.filter(p => dbPocket.some(d => d === p));
    // Also check if pocket code appears literally in DB address
    const pocketInDb = casePocket.filter(p => compoundCodeHit([p], dbAddr));
    const allPocketHits = new Set([...pocketHits, ...pocketInDb]);
    const pocketScore = Math.min(28, allPocketHits.size * 28);
    detail.pocketSectorHits = [...allPocketHits];

    // 4. Plot / house / khasra number match (0-22)
    const casePureNums = casePlots.filter(p => /^\d+/.test(p));
    const dbPureNums   = dbPlots.filter(p => /^\d+/.test(p));
    const exactPlotHits    = casePureNums.filter(n => dbPureNums.some(d => n === d));
    const compatPlotHits   = casePureNums.filter(n => dbPureNums.some(d => plotCompatible(n, d)));
    const plotScore = exactPlotHits.length > 0
      ? Math.min(22, exactPlotHits.length * 22)
      : Math.min(12, compatPlotHits.length * 12);
    detail.matchedPlots = exactPlotHits.length > 0 ? exactPlotHits : compatPlotHits;

    // 5. Locality match (0-15 for two-word canonical, 0-8 for single-word alias)
    const localityOverlap = [...caseLocality].filter(l => dbLocality.has(l));
    const twoWordHits  = localityOverlap.filter(l => l.length >= 8);  // canonical ≥ 8 chars
    const singleHits   = localityOverlap.filter(l => l.length < 8);
    const localityScore = Math.min(15, twoWordHits.length * 15) + Math.min(8, singleHits.length * 8);
    detail.localityHits = localityOverlap;

    // 6. Part / phase number bonus (0-8) — only fires when locality also matches
    const partHits = caseParts.filter(p => dbParts.includes(p));
    const partScore = (localityOverlap.length > 0 && partHits.length > 0) ? 8 : 0;
    detail.partHits = partHits;

    // 7. Owner name match (0-10 / 0-5)
    let ownerScore = 0;
    if (caseOwner && dbOwner) {
      const cWords = caseOwner.toUpperCase().split(/\s+/).filter(w => w.length >= 3);
      const dWords = dbOwner.toUpperCase().split(/\s+/).filter(w => w.length >= 3);
      if (cWords.length > 0 && dWords.length > 0) {
        // Last name of longer name vs all tokens (last names most distinctive)
        const caseLast = cWords[cWords.length - 1];
        const dbLast   = dWords[dWords.length - 1];
        if (caseLast === dbLast) {
          ownerScore = 10;
        } else {
          const hits = cWords.filter(w => dWords.includes(w)).length;
          ownerScore = hits > 0 ? Math.round((hits / Math.max(cWords.length, dWords.length)) * 5) : 0;
        }
      }
    }
    detail.ownerScore = ownerScore;

    // 8. Zone match (0-8)
    let zoneScore = 0;
    if (caseZone && effectiveDbZone) {
      zoneScore = caseZone === effectiveDbZone ? 8 : 0;
    } else if (caseZone && dbZone && !inferredDbZone) {
      // Stored zone only (no text inference possible) — lower confidence
      zoneScore = dbZone.toLowerCase().includes(caseZone.split(' ')[0].toLowerCase()) ? 4 : 0;
    }
    detail.zoneScore = zoneScore;

    // 9. General token overlap (0-15)
    const overlap    = tokenOverlap(caseToks, dbToks);
    const tokenScore = Math.round((overlap / Math.max(caseToks.size, dbToks.size, 1)) * 15);
    detail.tokenOverlap = overlap;

    // 10. Sub-number inside compact DB code (0-20)
    // Catches "case plot=57 + locality=SHALIMARBAGH" vs DB "BT-57 Shalimar Bagh"
    // Only fires when no stronger code signal already matched
    let subNumScore = 0;
    if (codeScore === 0 && alphaScore === 0) {
      const dbCompactNums = [...dbAddr.toUpperCase().matchAll(/\b[A-Z]{1,4}-(\d+)\b/g)].map(m => m[1]);
      const caseNums = casePlots.filter(p => /^\d+$/.test(p));
      const subHits = caseNums.filter(n => dbCompactNums.some(d => plotCompatible(n, d)));
      if (subHits.length > 0 && localityOverlap.length > 0) {
        subNumScore = 20;
      }
    }
    detail.subNumScore = subNumScore;

    // 11. Locality mismatch penalty (0 or negative)
    // "24-B" appears in thousands of Delhi properties. Without a locality anchor
    // the match is noise. If the case has a clear locality but the DB record's
    // locality doesn't overlap at all, heavily penalise.
    let localityPenalty = 0;
    if (caseLocality.size >= 1 && localityOverlap.length === 0 && dbLocality.size >= 1) {
      localityPenalty = -32;
    }
    detail.localityPenalty = localityPenalty;

    // 12. Zone mismatch penalty (0 or negative)
    // Uses text-inferred zones (more reliable than stored field).
    // Karol Bagh (Central Zone) should not match Dilshad Garden (Shahdara Zone).
    let zonePenalty = 0;
    if (caseZone && effectiveDbZone && caseZone !== effectiveDbZone) {
      zonePenalty = -22;
    }
    detail.zonePenalty = zonePenalty;

    // ── Total ──
    const raw = codeScore + alphaScore + pocketScore + plotScore
              + localityScore + partScore + ownerScore + zoneScore + tokenScore + subNumScore
              + localityPenalty + zonePenalty;
    const score = Math.min(100, Math.max(0, raw)); // floor at 0, cap at 100

    // ── Determine dominant reason ──
    let reason = 'PARTIAL';
    if (codeScore >= 40)              reason = 'COMPOUND_CODE';
    else if (alphaScore >= 35)        reason = 'ALPHA_CODE';
    else if (pocketScore >= 28)       reason = 'POCKET_SECTOR';
    else if (plotScore >= 22)         reason = 'PLOT_NUMBER';
    else if (localityScore >= 15)     reason = 'LOCALITY';
    else if (plotScore >= 12)         reason = 'PLOT_PARTIAL';
    else if (tokenScore >= 10)        reason = 'ADDRESS';

    return { score, reason, detail };
  }

  // ── Cross-match a single case ────────────────────────────────────────────────
  //
  // Two-pass DB fetch:
  //   Pass 1 (targeted):  compound codes + alphanumeric codes + pocket-sector codes
  //                       These are high-specificity — LIMIT 80
  //   Pass 2 (broad):     general tokens + plot numbers + khasra
  //                       LIMIT 200 to survive high-volume localities
  //
  // Minimum score threshold: 20 (was 25)
  // Alert status: CONFIRMED ≥ 55 · POTENTIAL < 55

  async matchCase(caseId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, propertyAddress: true, ownerName: true },
    });
    if (!c) throw new NotFoundException('Case not found');

    type DPRow = {
      id: string; address: string; zone: string | null;
      ownerName: string | null; noticeDate: Date;
      noticeNumber: string | null; bookingId: string | null;
    };

    const compoundCodes  = extractBlockPlotCodes(c.propertyAddress);
    const alphaCodes     = extractPlotNumbers(c.propertyAddress)
                            .filter(p => (/^[A-Z]/.test(p) && /\d/.test(p)) || /^\d+[-\/][A-Z]/.test(p));
    const pocketCodes    = extractPocketSectorCodes(c.propertyAddress);
    const specificTerms  = [...new Set([...compoundCodes, ...alphaCodes, ...pocketCodes])];

    const generalTokens = tokenise(c.propertyAddress);
    const plotNums      = extractPlotNumbers(c.propertyAddress)
                           .filter(p => /^\d+/.test(p));
    const broadTerms    = [...new Set([...generalTokens, ...plotNums])];

    if (specificTerms.length === 0 && broadTerms.length === 0)
      return { matched: 0, alerts: [] };

    const candidates = new Map<string, DPRow>();

    // Pass 1: targeted specific-identifier search
    if (specificTerms.length > 0) {
      const conds  = specificTerms.map((_, i) => `address ILIKE $${i + 1}`).join(' OR ');
      const params = specificTerms.map(t => `%${t}%`);
      const rows = await this.prisma.$queryRawUnsafe<DPRow[]>(
        `SELECT id, address, zone, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties WHERE ${conds} LIMIT 80`,
        ...params,
      );
      for (const r of rows) candidates.set(r.id, r);
    }

    // Pass 2: broad locality/number search
    if (broadTerms.length > 0) {
      const conds  = broadTerms.map((_, i) => `address ILIKE $${i + 1}`).join(' OR ');
      const params = broadTerms.map(t => `%${t}%`);
      const rows = await this.prisma.$queryRawUnsafe<DPRow[]>(
        `SELECT id, address, zone, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties WHERE ${conds} LIMIT 200`,
        ...params,
      );
      for (const r of rows) if (!candidates.has(r.id)) candidates.set(r.id, r);
    }

    const alerts: { demolitionPropertyId: string; score: number; matchReason: string }[] = [];

    for (const dp of candidates.values()) {
      const { score, reason } = this.scoreAddressPair(
        c.propertyAddress, dp.address,
        c.ownerName ?? null, dp.ownerName ?? null,
        dp.zone,
      );
      if (score >= 15) {
        alerts.push({ demolitionPropertyId: dp.id, score, matchReason: reason });
      }
    }

    let created = 0;
    for (const a of alerts.sort((x, y) => y.score - x.score).slice(0, 5)) {
      await this.prisma.demolitionAlert.upsert({
        where: {
          caseId_demolitionPropertyId: { caseId, demolitionPropertyId: a.demolitionPropertyId },
        },
        create: {
          caseId,
          demolitionPropertyId: a.demolitionPropertyId,
          matchStatus:     a.score >= 55 ? 'CONFIRMED' : 'POTENTIAL',
          confidenceScore: a.score,
          matchReason:     a.matchReason,
        },
        update: {
          confidenceScore: a.score,
          matchReason:     a.matchReason,
        },
      });
      created++;
    }

    if (created > 0) {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { hasDemolitionAlert: true },
      });
    }

    return { matched: created, alerts: alerts.slice(0, 5) };
  }

  // ── Bulk match all cases ─────────────────────────────────────────────────────

  async matchAllCases() {
    const cases = await this.prisma.case.findMany({
      where: { hasDemolitionAlert: false },
      select: { id: true, propertyAddress: true },
      take: 500,
    });

    let total = 0;
    for (const c of cases) {
      const { matched } = await this.matchCase(c.id);
      total += matched;
    }
    return { processed: cases.length, newAlerts: total };
  }

  // ── List alerts ──────────────────────────────────────────────────────────────

  async getAlerts(query: { status?: string; page?: number; limit?: number }) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const where: Prisma.DemolitionAlertWhereInput = {};
    if (query.status === 'open')      where.matchStatus = { not: 'DISMISSED' };
    if (query.status === 'confirmed') where.matchStatus = 'CONFIRMED';
    if (query.status === 'potential') where.matchStatus = 'POTENTIAL';
    if (query.status === 'dismissed') where.matchStatus = 'DISMISSED';

    const [data, total] = await Promise.all([
      this.prisma.demolitionAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          case: {
            select: {
              id: true, caseNumber: true, propertyAddress: true, ownerName: true,
              organization: { select: { name: true } },
            },
          },
          demolitionProperty: {
            select: {
              id: true, address: true, zone: true, ownerName: true,
              noticeDate: true, noticeNumber: true, bookingId: true,
            },
          },
        },
      }),
      this.prisma.demolitionAlert.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Dismiss / confirm an alert ───────────────────────────────────────────────

  async updateAlertStatus(
    alertId: string,
    status: 'CONFIRMED' | 'DISMISSED',
    reason?: string,
    userId?: string,
  ) {
    return this.prisma.demolitionAlert.update({
      where: { id: alertId },
      data: {
        matchStatus:     status,
        dismissedById:   status === 'DISMISSED' ? userId : null,
        dismissedAt:     status === 'DISMISSED' ? new Date() : null,
        dismissalReason: reason ?? null,
      },
    });
  }

  // ── Distinct zones ───────────────────────────────────────────────────────────

  async getZones() {
    const rows = await this.prisma.$queryRaw<{ zone: string }[]>`
      SELECT DISTINCT zone FROM demolition_properties
      WHERE zone IS NOT NULL ORDER BY zone
    `;
    return rows.map(r => r.zone);
  }

  // ── Smart live address check (used during case creation) ─────────────────────
  //
  // Three-pass fetch:
  //   Pass 1 (compound codes):    "BT-57", "G-91", "A-8"       LIMIT 60
  //   Pass 2 (contextual pairs):  "KHASRA%812%", "PLOT%57%"    LIMIT 60
  //   Pass 3 (locality/tokens):   "SHALIMARBAGH", "UTTAM"      LIMIT 120
  //
  // Results merged, deduplicated, and scored with scoreAddressPair().
  // Returns up to 8 results, min score 10.
  //
  // Confidence: HIGH ≥ 60 · MEDIUM ≥ 30 · LOW ≥ 10

  async checkAddress(query: {
    address: string;
    pincode?: string;
    ownerName?: string;
  }) {
    const { address, pincode, ownerName } = query;
    if (!address || address.trim().length < 4) return { matches: [] };

    type DPRow = {
      id: string; address: string; zone: string | null; locality: string | null;
      ownerName: string | null; noticeDate: Date; noticeNumber: string | null; bookingId: string | null;
    };

    const compoundCodes = extractBlockPlotCodes(address);
    const alphaCodes    = extractPlotNumbers(address)
      .filter(p => (/^[A-Z]/.test(p) && /\d/.test(p)) || /^\d+[-\/][A-Z]/.test(p));
    const pocketCodes   = extractPocketSectorCodes(address);
    const plotNums      = extractPlotNumbers(address).filter(p => /^\d+/.test(p));
    const lightToks     = lightTokenise(address);

    const pincodeVal = (address.match(/\b\d{6}\b/)
      ?? (pincode ? [pincode.match(/\b\d{6}\b/)?.[0]].filter(Boolean) : [])
    )?.[0] ?? null;

    // All specific high-precision identifiers for Pass 1
    const specificIds = [...new Set([...compoundCodes, ...alphaCodes, ...pocketCodes])];

    const candidates = new Map<string, DPRow>();

    const fetchRows = async (terms: string[], limit: number): Promise<DPRow[]> => {
      if (terms.length === 0) return [];
      const conds  = terms.map((_, i) => `address ILIKE $${i + 1}`).join(' OR ');
      const params = terms.map(t => `%${t}%`);
      return this.prisma.$queryRawUnsafe<DPRow[]>(
        `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties WHERE ${conds} LIMIT ${limit}`,
        ...params,
      );
    };

    // Pass 1: high-precision identifiers
    for (const r of await fetchRows(specificIds, 60))
      candidates.set(r.id, r);

    // Pass 2: contextual KHASRA/PLOT/H.NO keyword + number pairs
    const ctxTerms: string[] = [];
    const upper = preProcess(address).replace(/[^\w\s\/\-]/g, ' ');
    for (const kw of ['KHASRA', 'PLOT', 'HNO', 'SURVEY', 'GATA', 'KHATA', 'SHOP', 'FLAT']) {
      const re = new RegExp(`${kw}\\s+(\\d[\\d\\/\\-A-Z]*)`, 'i');
      const m  = upper.match(re);
      if (m?.[1]) ctxTerms.push(`%${kw}%${m[1]}%`);
    }
    // Run contextual pairs with raw ILIKE (not via fetchRows which wraps in %)
    if (ctxTerms.length > 0) {
      const conds  = ctxTerms.map((_, i) => `address ILIKE $${i + 1}`).join(' OR ');
      const rows   = await this.prisma.$queryRawUnsafe<DPRow[]>(
        `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties WHERE ${conds} LIMIT 60`,
        ...ctxTerms,
      );
      for (const r of rows) if (!candidates.has(r.id)) candidates.set(r.id, r);
    }

    // Pass 3: broad locality / light-token search
    const broadTerms = [...new Set([...lightToks, ...plotNums])].slice(0, 18);
    for (const r of await fetchRows(broadTerms, 120))
      if (!candidates.has(r.id)) candidates.set(r.id, r);

    // Pass 4: AND-search — locality token + plot number in the same record.
    // Catches compact DB format: "BT-57 Shalimar Bagh" when we have locality
    // "SHALIMARBAGH" + plot number "57". Simple ILIKE '%57%' with LIMIT 120
    // might miss the record if many records contain "57"; the AND constraint
    // pins locality and makes the search highly selective.
    const localityArr = [...localityTokens(address)]
      .filter(l => l.length >= 6 && !LIGHT_STOP.has(l))
      .slice(0, 3);
    if (localityArr.length > 0 && plotNums.length > 0) {
      for (const loc of localityArr) {
        for (const num of plotNums.slice(0, 4)) {
          const rows = await this.prisma.$queryRawUnsafe<DPRow[]>(
            `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
             FROM demolition_properties
             WHERE address ILIKE $1 AND address ILIKE $2
             LIMIT 40`,
            `%${loc}%`, `%${num}%`,
          );
          for (const r of rows) if (!candidates.has(r.id)) candidates.set(r.id, r);
        }
      }
    }

    // Pass 5: block-letter prefix search — if case has "Block BT" we search
    // "BT-%" records within the locality. Catches all "BT-*" variants.
    const caseBlocks = compoundCodes
      .map(c => c.split('-')[0])
      .filter((b, i, a) => b && b.length >= 1 && b.length <= 4 && a.indexOf(b) === i)
      .slice(0, 3);
    if (caseBlocks.length > 0 && localityArr.length > 0) {
      for (const block of caseBlocks) {
        for (const loc of localityArr.slice(0, 2)) {
          const rows = await this.prisma.$queryRawUnsafe<DPRow[]>(
            `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
             FROM demolition_properties
             WHERE address ILIKE $1 AND address ILIKE $2
             LIMIT 30`,
            `%${block}-%`, `%${loc}%`,
          );
          for (const r of rows) if (!candidates.has(r.id)) candidates.set(r.id, r);
        }
      }
    }

    // ── Score all candidates ──
    const scored = [...candidates.values()].map(dp => {
      const { score, reason, detail } = this.scoreAddressPair(
        address, dp.address,
        ownerName ?? null, dp.ownerName ?? null,
        dp.zone,
      );

      // Pincode bonus (not in scoreAddressPair since it's only in live-check context)
      const pincodeBonus = pincodeVal && dp.address.includes(pincodeVal) ? 6 : 0;
      const finalScore   = Math.min(100, score + pincodeBonus);

      return {
        id:           dp.id,
        address:      dp.address,
        zone:         dp.zone,
        locality:     dp.locality,
        ownerName:    dp.ownerName,
        noticeDate:   dp.noticeDate,
        noticeNumber: dp.noticeNumber,
        bookingId:    dp.bookingId,
        score:        finalScore,
        matchedOn: {
          ...detail,
          pincode: pincodeBonus > 0,
        },
        // Raised thresholds to reduce false positives from code-only matches
        // without locality confirmation (e.g., "24-B" alone hitting Karol Bagh).
        confidence: finalScore >= 65 ? 'HIGH' : finalScore >= 35 ? 'MEDIUM' : 'LOW',
        matchReason: reason,
      };
    });

    // Keep highest score per id, filter by minimum threshold, sort descending
    const best = new Map<string, typeof scored[0]>();
    for (const s of scored) {
      const prev = best.get(s.id);
      if (!prev || s.score > prev.score) best.set(s.id, s);
    }

    return {
      matches: [...best.values()]
        .filter(s => s.score >= 22)           // min bar raised; pure code-only hits filtered out
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),                          // top 6 — enough coverage, reduces noise
    };
  }
}
