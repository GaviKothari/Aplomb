// Normalizes raw OCR text and extracted field values for Indian property documents.
// All maps are order-independent — apply with replaceAll on lowercased input.

export const UNIT_MAP: Record<string, string> = {
  'sq feet': 'sqft', 'sq. feet': 'sqft', 'sq.feet': 'sqft',
  'sq ft': 'sqft', 'sq. ft': 'sqft', 'sq.ft': 'sqft',
  'square feet': 'sqft', 'square foot': 'sqft',
  'sq meter': 'sqm', 'sq. meter': 'sqm', 'sq.meter': 'sqm',
  'sq mt': 'sqm', 'sq. mt': 'sqm', 'sq.mt': 'sqm',
  'sq metre': 'sqm', 'square meter': 'sqm', 'square metre': 'sqm',
  'sq yard': 'sqyd', 'sq. yard': 'sqyd', 'sq.yard': 'sqyd',
  'sq yd': 'sqyd', 'sq. yd': 'sqyd', 'sq.yd': 'sqyd',
  'square yard': 'sqyd',
  'hectare': 'ha', 'hectares': 'ha',
  'bigha': 'bigha', 'biswa': 'biswa', 'biswansi': 'biswansi',
  'marla': 'marla', 'kanal': 'kanal', 'kila': 'kila',
  'gaj': 'gaj', 'guz': 'gaj',
  'guntha': 'guntha', 'gunta': 'guntha',
  'cent': 'cents', 'cents': 'cents',
};

export const DIRECTION_MAP: Record<string, string> = {
  'uttar': 'North', 'uttari': 'North', 'uttara': 'North',
  'dakshin': 'South', 'dakshini': 'South', 'dakhini': 'South',
  'purv': 'East', 'purvi': 'East', 'purab': 'East', 'purba': 'East', 'pooarb': 'East',
  'paschim': 'West', 'pashchim': 'West', 'paschimi': 'West', 'pashchimi': 'West',
  'madhya': 'Center', 'beech': 'Center',
};

// All aliases that map to canonical fieldKey names
export const FIELD_ALIAS_MAP: Record<string, string> = {
  // Owner
  'owner': 'ownerName', 'malik': 'ownerName', 'swami': 'ownerName', 'khatadar': 'ownerName',
  'khasradar': 'ownerName', 'vendor': 'ownerName', 'seller': 'ownerName',
  'mortgagor': 'ownerName', 'transferor': 'ownerName', 'grantor': 'ownerName',
  'party of the first part': 'ownerName', 'first party': 'ownerName',
  'purchaser': 'coOwnerName', 'buyer': 'coOwnerName', 'mortgagee': 'coOwnerName',
  'party of the second part': 'coOwnerName', 'second party': 'coOwnerName',
  // House / Flat
  'house no': 'houseNumber', 'house number': 'houseNumber',
  'h.no': 'houseNumber', 'h no': 'houseNumber', 'h/no': 'houseNumber',
  'makan no': 'houseNumber', 'makan number': 'houseNumber', 'makaan no': 'houseNumber',
  'flat no': 'flatNumber', 'flat number': 'flatNumber',
  'f.no': 'flatNumber', 'unit no': 'flatNumber', 'apartment no': 'flatNumber', 'apt no': 'flatNumber',
  // Plot
  'plot no': 'plotNumber', 'plot number': 'plotNumber', 'plot': 'plotNumber',
  'p.no': 'plotNumber', 'p no': 'plotNumber',
  'bhu khand': 'plotNumber', 'bhukhand': 'plotNumber', 'bhu-khand': 'plotNumber',
  // Floor / Tower / Block
  'floor no': 'floorNumber', 'floor number': 'floorNumber', 'floor': 'floorNumber',
  'manzil': 'floorNumber',
  'tower': 'towerName', 'wing': 'towerName', 'block': 'blockName',
  'pocket': 'pocket', 'sector': 'sector',
  // Survey / Khasra / Khata
  'survey no': 'surveyNumber', 'survey number': 'surveyNumber', 's.no': 'surveyNumber',
  'khasra no': 'khasraNumber', 'khasra number': 'khasraNumber', 'khasra': 'khasraNumber',
  'gata no': 'gataNumber', 'gata number': 'gataNumber', 'gata': 'gataNumber',
  'khata no': 'khataNumber', 'khata number': 'khataNumber', 'khata': 'khataNumber',
  'khewat no': 'khewatNumber', 'khewat': 'khewatNumber',
  'patta no': 'pattaNumber', 'patta': 'pattaNumber',
  // Registration
  'registration no': 'registrationNumber', 'registration number': 'registrationNumber',
  'reg no': 'registrationNumber', 'reg. no': 'registrationNumber',
  'registry no': 'registrationNumber', 'deed no': 'registrationNumber',
  'document no': 'registrationNumber', 'instrument no': 'registrationNumber',
  'registration date': 'registrationDate', 'reg date': 'registrationDate',
  'date of registration': 'registrationDate', 'date of registry': 'registrationDate',
  // Area
  'total area': 'totalArea', 'land area': 'totalArea', 'plot area': 'totalArea',
  'site area': 'totalArea', 'area of plot': 'totalArea',
  'built up area': 'builtUpArea', 'built-up area': 'builtUpArea', 'bua': 'builtUpArea',
  'covered area': 'builtUpArea', 'plinth area': 'builtUpArea',
  'super area': 'superArea', 'super built up': 'superArea', 'saleable area': 'superArea',
  'carpet area': 'carpetArea', 'net area': 'carpetArea',
  // Road
  'road width': 'roadWidth', 'width of road': 'roadWidth', 'road width (feet)': 'roadWidth',
  'approach road width': 'roadWidth', 'width of street': 'roadWidth',
  // Address components
  'village': 'village', 'gram': 'village', 'gaon': 'village',
  'tehsil': 'tehsil', 'taluka': 'tehsil', 'taluk': 'tehsil',
  'district': 'district', 'zila': 'district',
  'state': 'state', 'rajya': 'state',
  'pincode': 'pincode', 'pin code': 'pincode', 'pin no': 'pincode', 'zip': 'pincode',
  // Financial
  'loan no': 'loanNumber', 'loan number': 'loanNumber', 'account no': 'loanNumber',
  'loan account no': 'loanNumber',
  'property value': 'marketValue', 'market value': 'marketValue',
  'circle rate': 'circleRate', 'guidance value': 'circleRate',
  'stamp duty': 'stampDuty', 'sale consideration': 'saleConsideration',
};

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')    // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')   // max 2 consecutive newlines
    .trim();
}

export function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return UNIT_MAP[lower] ?? raw.trim();
}

export function normalizeDirection(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return DIRECTION_MAP[lower] ?? raw.trim();
}

export function normalizeFieldKey(raw: string): string {
  const lower = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  return FIELD_ALIAS_MAP[lower] ?? toCamelCase(raw);
}

function toCamelCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
}

export function normalizeOwnerName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\bS\/O\b|\bW\/O\b|\bD\/O\b|\bSON OF\b|\bWIFE OF\b|\bDAUGHTER OF\b/gi, '')
    .replace(/\bAGED\s+\d+\b/gi, '')
    .replace(/\bR\/O\b|\bRESIDENT OF\b/gi, '')
    .trim()
    .replace(/,\s*$/, '')
    .trim();
}

export function normalizePincode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

export function normalizeArea(value: string, unit: string): { value: number; unit: string } | null {
  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num)) return null;
  return { value: num, unit: normalizeUnit(unit) };
}

export function normalizeDate(raw: string): string | null {
  // Handles: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, DD Month YYYY
  const patterns = [
    { re: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, order: 'dmy' },
    { re: /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, order: 'ymd' },
    {
      re: /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
      order: 'dmy_named',
    },
  ];
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
    august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  for (const { re, order } of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    let d: number, mo: number, y: number;
    if (order === 'dmy') { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if (order === 'ymd') { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else { d = +m[1]; mo = months[m[2].toLowerCase()] ?? 0; y = +m[3]; }
    if (!d || !mo || !y) continue;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}
