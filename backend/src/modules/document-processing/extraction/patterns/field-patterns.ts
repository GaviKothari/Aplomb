// Deterministic extraction patterns for Indian property documents.
// Every pattern has: regex, fieldKey, confidence, and a label for debugging.
// Patterns are tried in order; first match wins for single-value fields.
// Multiple matches are merged for multi-value fields (boundaries, amenities).

export interface ExtractionPattern {
  field: string;
  label: string;
  patterns: RegExp[];
  confidence: number;
  extractor?: (match: RegExpMatchArray, fullText: string) => string | null;
  multiValue?: boolean;
}

const name = (s: string) => `([A-Z][A-Za-z'\\-\\.]{1,30}(?:\\s+[A-Z][A-Za-z'\\-\\.]{1,30}){0,5})`;
const num  = `([\\d,\\.]+)`;
const ws   = `[\\s:–\\-]*`;

export const FIELD_PATTERNS: ExtractionPattern[] = [
  // ── Owner / Party Names ──────────────────────────────────────────────────

  {
    field: 'ownerName',
    label: 'Owner name — labeled',
    confidence: 0.90,
    patterns: [
      /(?:owner|khatadar|malik|swami|khasradar|bhoomi\s*swami)\s*[:\-]\s*([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|d\/o|son\s+of|wife\s+of|aged|\n|,|$))/gi,
      /(?:vendor|seller|transferor|grantor|mortgagor)\s*[:\-]\s*([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|d\/o|son\s+of|aged|\n|,|$))/gi,
      /(?:party\s+of\s+the\s+first\s+part|first\s+party)\s*[:\-]?\s*(?:M\/s\.?\s*|Shri\.?\s*|Smt\.?\s*|Mr\.?\s*|Mrs\.?\s*)?([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|aged|\n|,))/gi,
      /(?:in\s+the\s+name\s+of|registered\s+in\s+name\s+of)\s+(?:Shri\.?\s*|Smt\.?\s*|Mr\.?\s*|Mrs\.?\s*)?([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|aged|\n|,))/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/,\s*$/, '').trim() ?? null,
  },

  {
    field: 'coOwnerName',
    label: 'Co-owner / second party',
    confidence: 0.85,
    patterns: [
      /(?:purchaser|buyer|mortgagee|transferee|grantee|co[-\s]?owner)\s*[:\-]\s*([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|aged|\n|,|$))/gi,
      /(?:party\s+of\s+the\s+second\s+part|second\s+party)\s*[:\-]?\s*(?:Shri\.?\s*|Smt\.?\s*|Mr\.?\s*|Mrs\.?\s*)?([A-Z][A-Za-z\s'\.]{3,60})(?=\s*(?:s\/o|w\/o|aged|\n|,))/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/,\s*$/, '').trim() ?? null,
  },

  {
    field: 'fatherOrHusbandName',
    label: 'Father / husband name (S/o W/o)',
    confidence: 0.88,
    patterns: [
      /\bS\/O\s+(?:Late\s+)?(?:Shri\.?\s*)?([A-Z][A-Za-z\s'\.]{3,50})(?=\s*(?:,|aged|r\/o|\n|$))/gi,
      /\bW\/O\s+(?:Late\s+)?(?:Shri\.?\s*)?([A-Z][A-Za-z\s'\.]{3,50})(?=\s*(?:,|aged|r\/o|\n|$))/gi,
      /\b(?:son\s+of|wife\s+of|daughter\s+of)\s+(?:Late\s+)?([A-Z][A-Za-z\s'\.]{3,50})(?=\s*(?:,|aged|\n|$))/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Property Identifiers ─────────────────────────────────────────────────

  {
    field: 'houseNumber',
    label: 'House number',
    confidence: 0.92,
    patterns: [
      /(?:house\s*(?:no|number|#)\.?|h\.?\s*no\.?|makan\s*(?:no|number)\.?|makaan\s*(?:no|number)\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
      /(?:dwelling\s+house|property\s+no\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'flatNumber',
    label: 'Flat / unit number',
    confidence: 0.92,
    patterns: [
      /(?:flat\s*(?:no|number|#)\.?|unit\s*(?:no|number)\.?|apartment\s*(?:no|number)\.?|apt\.?\s*(?:no|number)\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
      /(?:f\.?\s*no\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'plotNumber',
    label: 'Plot / khasra number',
    confidence: 0.92,
    patterns: [
      /(?:plot\s*(?:no|number|#)\.?|p\.?\s*no\.?|bhukhand\s*(?:no|sankhya)?|bhu[-\s]khand)\s*[:\-]?\s*([\w\-\/]+)/gi,
      /(?:khasra\s*(?:no|number)\.?|gata\s*(?:no|number)\.?|field\s*(?:no|number)\.?)\s*[:\-]?\s*([\w\-\/\&]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'surveyNumber',
    label: 'Survey number',
    confidence: 0.90,
    patterns: [
      /(?:survey\s*(?:no|number)\.?|s\.?\s*no\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'khasraNumber',
    label: 'Khasra number',
    confidence: 0.90,
    patterns: [
      /\bkhasra\s*(?:no|number|#)\.?\s*[:\-]?\s*([\w\-\/\&]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'khataNumber',
    label: 'Khata number',
    confidence: 0.88,
    patterns: [
      /\bkhata\s*(?:no|number)\.?\s*[:\-]?\s*([\d\-\/]+)/gi,
      /\bkhewat\s*(?:no|number)\.?\s*[:\-]?\s*([\d\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'floorNumber',
    label: 'Floor number',
    confidence: 0.88,
    patterns: [
      /(?:floor\s*(?:no|number)\.?|manzil)\s*[:\-]?\s*([\w\-]+)/gi,
      /(\d+)(?:st|nd|rd|th)\s*floor/gi,
      /ground\s*floor/gi,
    ],
    extractor: (m, full) => {
      if (m[0]?.toLowerCase().includes('ground')) return 'Ground';
      return (m[1] ?? m[0])?.trim() ?? null;
    },
  },

  {
    field: 'towerName',
    label: 'Tower / wing / block',
    confidence: 0.85,
    patterns: [
      /(?:tower|wing)\s*[:\-]?\s*([A-Za-z0-9\-]+)/gi,
      /\bblock\s*[:\-]?\s*([A-Za-z0-9\-]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'pocket',
    label: 'Pocket',
    confidence: 0.85,
    patterns: [
      /\bpocket\s*[:\-]?\s*([A-Za-z0-9\-]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'sector',
    label: 'Sector',
    confidence: 0.85,
    patterns: [
      /\bsector\s*[:\-]?\s*(\d+[A-Za-z]?)/gi,
      /\bsec\.?\s*[:\-]?\s*(\d+[A-Za-z]?)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Address Components ───────────────────────────────────────────────────

  {
    field: 'village',
    label: 'Village / Gram',
    confidence: 0.82,
    patterns: [
      /\b(?:village|gram|gaon|vill\.?)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\s*(?:,|tehsil|teh\.|district|\n))/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'tehsil',
    label: 'Tehsil / Taluka',
    confidence: 0.85,
    patterns: [
      /\b(?:tehsil|taluka|taluk|teh\.?)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\s*(?:,|district|distt|\n))/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'district',
    label: 'District',
    confidence: 0.85,
    patterns: [
      /\b(?:district|distt?\.?|zila)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\s*(?:,|state|pin|\n))/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'state',
    label: 'State',
    confidence: 0.85,
    patterns: [
      /\bstate\s*[:\-]?\s*([A-Za-z\s]{3,30})(?=\s*(?:,|pin|pincode|\n|$))/gi,
      new RegExp(`\\b(Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Delhi|Jammu and Kashmir|Ladakh)\\b`, 'gi'),
    ],
    extractor: (m) => m[1]?.trim() ?? m[0]?.trim() ?? null,
  },

  {
    field: 'pincode',
    label: 'Pincode',
    confidence: 0.95,
    patterns: [
      /\b(?:pin\s*code|pincode|pin\s*no\.?|zip)\s*[:\-]?\s*(\d{6})\b/gi,
      /\b([1-9]\d{5})\b/g,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Area / Measurements ──────────────────────────────────────────────────

  {
    field: 'totalArea',
    label: 'Total / land / plot area',
    confidence: 0.88,
    patterns: [
      /(?:total\s+area|land\s+area|plot\s+area|site\s+area|area\s+of\s+plot)\s*[:\-]?\s*([\d,\.]+)\s*(sq\.?\s*(?:ft|feet|m|mt|meter|yard|yd)|sqft|sqm|sqyd|acres?|hectares?|bigha|biswa|marla|kanal|gaj|guntha)/gi,
    ],
    extractor: (m) => `${m[1]?.replace(/,/g, '')} ${m[2]}`.trim(),
  },

  {
    field: 'builtUpArea',
    label: 'Built-up / covered area',
    confidence: 0.88,
    patterns: [
      /(?:built[\s\-]?up\s+area|covered\s+area|plinth\s+area|bua|floor\s+area)\s*[:\-]?\s*([\d,\.]+)\s*(sq\.?\s*(?:ft|feet|m|mt|meter|yard|yd)|sqft|sqm|sqyd)/gi,
    ],
    extractor: (m) => `${m[1]?.replace(/,/g, '')} ${m[2]}`.trim(),
  },

  {
    field: 'superArea',
    label: 'Super / saleable area',
    confidence: 0.85,
    patterns: [
      /(?:super\s+(?:built[\s\-]?up\s+)?area|saleable\s+area)\s*[:\-]?\s*([\d,\.]+)\s*(sq\.?\s*(?:ft|feet|m|mt)|sqft|sqm)/gi,
    ],
    extractor: (m) => `${m[1]?.replace(/,/g, '')} ${m[2]}`.trim(),
  },

  {
    field: 'carpetArea',
    label: 'Carpet area',
    confidence: 0.88,
    patterns: [
      /(?:carpet\s+area|net\s+area)\s*[:\-]?\s*([\d,\.]+)\s*(sq\.?\s*(?:ft|feet|m|mt)|sqft|sqm)/gi,
    ],
    extractor: (m) => `${m[1]?.replace(/,/g, '')} ${m[2]}`.trim(),
  },

  // ── Road Width ───────────────────────────────────────────────────────────

  {
    field: 'roadWidth',
    label: 'Road width',
    confidence: 0.88,
    patterns: [
      /(?:road\s+width|width\s+of\s+road|width\s+of\s+street|approach\s+road\s+width|width\s+of\s+approach\s+road)\s*[:\-]?\s*([\d\.]+)\s*(?:feet|ft\.?|meter|mtr\.?|m\.?)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Registration / Legal ─────────────────────────────────────────────────

  {
    field: 'registrationNumber',
    label: 'Registration / deed number',
    confidence: 0.90,
    patterns: [
      /(?:registration\s*(?:no|number)\.?|reg\.?\s*(?:no|number)\.?|registry\s*(?:no|number)\.?|deed\s*(?:no|number)\.?|document\s*(?:no|number)\.?|instrument\s*(?:no|number)\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'registrationDate',
    label: 'Registration date',
    confidence: 0.88,
    patterns: [
      /(?:registration\s+date|date\s+of\s+registration|date\s+of\s+(?:execution|registry|deed))\s*[:\-]?\s*([\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{4})/gi,
      /(?:registered\s+on|executed\s+on)\s+([\d]{1,2}[\/\-\.][\d]{1,2}[\/\-\.][\d]{4})/gi,
      /(?:registration\s+date|date\s+of\s+registration)\s*[:\-]?\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'propertyType',
    label: 'Property type',
    confidence: 0.80,
    patterns: [
      /(?:type\s+of\s+property|property\s+type)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\n|,|$)/gi,
      /\b(residential\s+(?:flat|apartment|house|plot|land)|commercial\s+(?:shop|office|property|space)|agricultural\s+land|industrial\s+plot|residential\s+plot)\b/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Boundaries ───────────────────────────────────────────────────────────

  {
    field: 'boundaryNorth',
    label: 'North boundary',
    confidence: 0.85,
    patterns: [
      /(?:north|uttar(?:i|a)?|northern\s+side)\s*[:\-]\s*([^,\n;]{5,80})/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/[,;]$/, '') ?? null,
  },

  {
    field: 'boundarySouth',
    label: 'South boundary',
    confidence: 0.85,
    patterns: [
      /(?:south|dakshin(?:i)?|southern\s+side)\s*[:\-]\s*([^,\n;]{5,80})/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/[,;]$/, '') ?? null,
  },

  {
    field: 'boundaryEast',
    label: 'East boundary',
    confidence: 0.85,
    patterns: [
      /(?:east|purv(?:i)?|purab|eastern\s+side)\s*[:\-]\s*([^,\n;]{5,80})/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/[,;]$/, '') ?? null,
  },

  {
    field: 'boundaryWest',
    label: 'West boundary',
    confidence: 0.85,
    patterns: [
      /(?:west|paschim(?:i)?|western\s+side)\s*[:\-]\s*([^,\n;]{5,80})/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/[,;]$/, '') ?? null,
  },

  // ── Financial ────────────────────────────────────────────────────────────

  {
    field: 'saleConsideration',
    label: 'Sale consideration / price',
    confidence: 0.82,
    patterns: [
      /(?:sale\s+consideration|consideration|agreed\s+value|total\s+consideration|purchase\s+price|sale\s+price)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,\.]+)/gi,
      /(?:Rs\.?|INR|₹)\s*([\d,\.]+)\s*(?:\(?(?:Rupees|Rs\.?)\)?)?/gi,
    ],
    extractor: (m) => m[1]?.replace(/,/g, '').trim() ?? null,
  },

  {
    field: 'stampDuty',
    label: 'Stamp duty',
    confidence: 0.82,
    patterns: [
      /(?:stamp\s+duty|stamp\s+duty\s+paid)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,\.]+)/gi,
    ],
    extractor: (m) => m[1]?.replace(/,/g, '').trim() ?? null,
  },

  {
    field: 'marketValue',
    label: 'Market / property value',
    confidence: 0.80,
    patterns: [
      /(?:market\s+value|property\s+value|total\s+market\s+value)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,\.]+)/gi,
      /(?:circle\s+rate|guidance\s+value)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,\.]+)/gi,
    ],
    extractor: (m) => m[1]?.replace(/,/g, '').trim() ?? null,
  },

  {
    field: 'loanNumber',
    label: 'Loan / account number',
    confidence: 0.85,
    patterns: [
      /(?:loan\s*(?:account)?\s*(?:no|number)\.?|loan\s+a\/c\s*(?:no)?\.?)\s*[:\-]?\s*([\w\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Property Address (full) ───────────────────────────────────────────────

  {
    field: 'propertyAddress',
    label: 'Situated at / property address',
    confidence: 0.75,
    patterns: [
      /(?:situated\s+at|located\s+at|property\s+(?:is\s+)?situated|premises\s+(?:is\s+)?situated|property\s+address)\s*[:\-]?\s*([^\n]{20,200})/gi,
      /(?:description\s+of\s+property|property\s+description)\s*[:\-]?\s*([^\n]{20,200})/gi,
    ],
    extractor: (m) => m[1]?.trim().replace(/\s+/g, ' ') ?? null,
  },

  // ── Mutation ─────────────────────────────────────────────────────────────

  {
    field: 'mutationNumber',
    label: 'Mutation number',
    confidence: 0.85,
    patterns: [
      /(?:mutation\s*(?:no|number)\.?|intkal\s*(?:no)?\.?)\s*[:\-]?\s*([\d\-\/]+)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Construction ─────────────────────────────────────────────────────────

  {
    field: 'ageOfConstruction',
    label: 'Age of construction',
    confidence: 0.80,
    patterns: [
      /(?:age\s+of\s+(?:construction|building)|year\s+of\s+(?:construction|completion))\s*[:\-]?\s*(\d{1,2}\s*(?:years?|yrs?)?)/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'constructionType',
    label: 'Construction type / structure',
    confidence: 0.78,
    patterns: [
      /(?:type\s+of\s+construction|construction\s+type|structure\s+type)\s*[:\-]?\s*([A-Za-z\s]{3,40})(?=\n|,|$)/gi,
      /\b(RCC\s+(?:framed\s+)?structure|load\s+bearing|pucca|kutcha|semi[-\s]?pucca)\b/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  {
    field: 'numberOfFloors',
    label: 'Total floors in building',
    confidence: 0.80,
    patterns: [
      /(?:total\s+floors?|number\s+of\s+floors?|no\.?\s+of\s+floors?)\s*[:\-]?\s*(\d+)/gi,
      /(\d+)[\s\-]+(?:storeyed|storied|story|storey|floor(?:ed)?)\s+building/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },

  // ── Remarks ───────────────────────────────────────────────────────────────

  {
    field: 'remarks',
    label: 'Remarks / observations',
    confidence: 0.65,
    patterns: [
      /(?:remarks?|observations?|notes?|special\s+remarks?)\s*[:\-]\s*([^\n]{10,200})/gi,
    ],
    extractor: (m) => m[1]?.trim() ?? null,
  },
];

// Fields that should prefer the first high-confidence match only
export const SINGLE_VALUE_FIELDS = new Set([
  'ownerName', 'coOwnerName', 'fatherOrHusbandName',
  'houseNumber', 'flatNumber', 'plotNumber', 'surveyNumber',
  'khasraNumber', 'khataNumber', 'floorNumber', 'towerName',
  'sector', 'pocket', 'village', 'tehsil', 'district', 'state', 'pincode',
  'registrationNumber', 'registrationDate', 'mutationNumber',
  'totalArea', 'builtUpArea', 'superArea', 'carpetArea',
  'roadWidth', 'ageOfConstruction', 'constructionType', 'numberOfFloors',
  'saleConsideration', 'stampDuty', 'marketValue', 'loanNumber',
  'propertyAddress', 'propertyType',
]);

export const BOUNDARY_FIELDS = new Set([
  'boundaryNorth', 'boundarySouth', 'boundaryEast', 'boundaryWest',
]);
