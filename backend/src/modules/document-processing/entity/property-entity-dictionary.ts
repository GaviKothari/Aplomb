/**
 * Universal property entity dictionary.
 * No document type classification needed — every field is tried against every document.
 * Keywords are split into strong (high confidence) and supporting (lower confidence).
 * Value types drive how we parse the text found near the keyword.
 */

export type FieldType = 'text' | 'currency' | 'date' | 'area' | 'number' | 'pincode';

export interface EntityField {
  key:         string;
  label:       string;
  type:        FieldType;
  important?:  boolean;
  // Strong keywords: high weight. Found alone = reliable signal.
  strong:      string[];
  // Supporting keywords: weaker signal, more common words
  supporting:  string[];
  validate?:   (v: string) => boolean;
  transform?:  (v: string) => string;
}

export const PROPERTY_ENTITY_DICTIONARY: EntityField[] = [

  // ── People ──────────────────────────────────────────────────────────────────

  {
    key: 'vendorName', label: 'Vendor / Seller', type: 'text', important: true,
    strong:     ['vendor', 'seller', 'transferor', 'executant', 'first party', 'party of the first part',
                 'विक्रेता', 'बिक्रेता', 'प्रथम पक्ष'],
    supporting: ['grantor', 'mortgagor', 'conveyor', 'बेचने वाला'],
  },

  {
    key: 'purchaserName', label: 'Purchaser / Buyer', type: 'text', important: true,
    strong:     ['purchaser', 'buyer', 'transferee', 'second party', 'party of the second part',
                 'क्रेता', 'खरीदार', 'द्वितीय पक्ष'],
    supporting: ['grantee', 'mortgagee', 'vendee', 'खरीदने वाला'],
  },

  {
    key: 'ownerName', label: 'Owner Name', type: 'text', important: true,
    strong:     ['owner', 'property owner', 'owner name', 'assessed to', 'bhoomidhar',
                 'मालिक', 'स्वामी', 'भूमिधर', 'खातेदार'],
    supporting: ['recorded in the name', 'held by', 'occupant', 'in the name of'],
  },

  {
    key: 'borrowerName', label: 'Borrower / Applicant', type: 'text',
    strong:     ['borrower', 'applicant', 'mortgagor', 'loan applicant',
                 'आवेदक', 'ऋणकर्ता', 'उधारकर्ता'],
    supporting: ['loanee', 'account holder'],
  },

  // ── Property Location ────────────────────────────────────────────────────────

  {
    key: 'propertyAddress', label: 'Property Address', type: 'text', important: true,
    strong:     ['property situated at', 'property known as', 'property described as',
                 'situated at', 'property at', 'located at', 'site address',
                 'संपत्ति स्थित', 'मकान स्थित', 'संपत्ति पता', 'स्थित'],
    supporting: ['all that', 'all that piece', 'property being', 'premises'],
  },

  {
    key: 'houseNumber', label: 'House / Flat No.', type: 'text',
    strong:     ['house no', 'house number', 'h no', 'h.no', 'flat no', 'flat number',
                 'door no', 'property no',
                 'मकान नं', 'मकान नंबर', 'भवन संख्या', 'फ्लैट नं'],
    supporting: ['unit no', 'apartment no', 'dwelling'],
  },

  {
    key: 'plotNumber', label: 'Plot / Khasra No.', type: 'text',
    strong:     ['plot no', 'plot number', 'plot no.', 'khasra no', 'khasra number', 'survey no',
                 'gata no', 'gata number',
                 'खसरा नं', 'खसरा संख्या', 'गाटा नं', 'भूखंड नं', 'प्लॉट नं'],
    supporting: ['site no', 'parcel no', 'field no', 'survey number'],
  },

  {
    key: 'khataNumber', label: 'Khata / Khewat No.', type: 'text',
    strong:     ['khata no', 'khata number', 'khatauni no', 'khewat no',
                 'खाता नं', 'खतौनी नं', 'खेवट नं'],
    supporting: ['account no', 'record no'],
  },

  {
    key: 'locality', label: 'Locality / Colony / Sector', type: 'text',
    strong:     ['locality', 'colony', 'sector', 'block', 'pocket', 'phase', 'extension',
                 'nagar', 'vihar', 'enclave', 'marg',
                 'मोहल्ला', 'कॉलोनी', 'सेक्टर', 'इलाका'],
    supporting: ['area', 'zone', 'ward', 'sub-division'],
  },

  {
    key: 'villageName', label: 'Village / Gram', type: 'text',
    strong:     ['village', 'gram', 'mauza', 'gaon', 'ग्राम', 'गांव', 'मौज़ा'],
    supporting: ['hamlet', 'settlement'],
  },

  {
    key: 'tehsil', label: 'Tehsil / Taluka', type: 'text',
    strong:     ['tehsil', 'taluka', 'taluk', 'तहसील', 'तालुका'],
    supporting: ['sub-district', 'block'],
  },

  {
    key: 'district', label: 'District', type: 'text',
    strong:     ['district', 'zila', 'जिला', 'जिला नाम'],
    supporting: ['dt.', 'dist.'],
  },

  {
    key: 'state', label: 'State', type: 'text',
    strong:     ['state', 'rajya', 'राज्य'],
    supporting: ['st.'],
    validate: (v) => v.length < 40,
  },

  {
    key: 'pincode', label: 'Pincode', type: 'pincode',
    strong:     ['pin code', 'pincode', 'pin no', 'postal code', 'zip',
                 'पिन कोड', 'पिन'],
    supporting: [],
    validate: (v) => /^\d{6}$/.test(v),
    transform: (v) => v.replace(/\D/g, '').slice(0, 6),
  },

  {
    key: 'roadWidth', label: 'Road Width', type: 'area',
    strong:     ['road width', 'width of road', 'approach road width', 'road width feet',
                 'सड़क चौड़ाई', 'मार्ग चौड़ाई'],
    supporting: ['street width', 'passage width'],
  },

  // ── Area ────────────────────────────────────────────────────────────────────

  {
    key: 'totalArea', label: 'Total Area', type: 'area', important: true,
    strong:     ['total area', 'land area', 'plot area', 'site area', 'area of plot',
                 'admeasuring', 'measuring', 'total land area',
                 'कुल क्षेत्रफल', 'भूमि क्षेत्रफल', 'रकबा', 'भूखंड क्षेत्र'],
    supporting: ['area', 'क्षेत्रफल', 'extent'],
  },

  {
    key: 'builtUpArea', label: 'Built-up Area', type: 'area',
    strong:     ['built up area', 'built-up area', 'plinth area', 'covered area',
                 'floor area', 'constructed area',
                 'निर्मित क्षेत्र', 'प्लिंथ क्षेत्र'],
    supporting: ['bua', 'floor space'],
  },

  {
    key: 'carpetArea', label: 'Carpet Area', type: 'area',
    strong:     ['carpet area', 'net area', 'usable area', 'कारपेट क्षेत्र'],
    supporting: ['carpet'],
  },

  // ── Registration ─────────────────────────────────────────────────────────────

  {
    key: 'registrationDate', label: 'Registration Date', type: 'date', important: true,
    strong:     ['registration date', 'date of registration', 'registered on', 'reg date',
                 'date of registry', 'executed on',
                 'पंजीयन दिनांक', 'पंजीकरण तारीख', 'रजिस्ट्री दिनांक'],
    supporting: ['dated', 'on this day'],
  },

  {
    key: 'registrationNumber', label: 'Registration No.', type: 'text', important: true,
    strong:     ['registration no', 'reg no', 'registry no', 'document no', 'deed no',
                 'registration number', 'instrument no', 'book no', 'serial no',
                 'पंजीयन क्रमांक', 'दस्तावेज क्रमांक', 'रजिस्ट्री नं'],
    supporting: ['vol no', 'file no'],
  },

  {
    key: 'subRegistrarOffice', label: 'Sub-Registrar Office', type: 'text',
    strong:     ['sub registrar', 'sub-registrar', 'sr office', 'registrar office',
                 'उप पंजीयक', 'उप-पंजीयक', 'पंजीयन कार्यालय'],
    supporting: ['registrar'],
  },

  {
    key: 'stampDuty', label: 'Stamp Duty', type: 'currency',
    strong:     ['stamp duty', 'stamp duty paid', 'court fee', 'स्टाम्प शुल्क', 'कोर्ट फीस'],
    supporting: ['stamp'],
    transform: (v) => v.replace(/,/g, ''),
  },

  // ── Financial ────────────────────────────────────────────────────────────────

  {
    key: 'saleAmount', label: 'Sale Amount', type: 'currency', important: true,
    strong:     ['sale consideration', 'sale price', 'agreed sale price', 'total consideration',
                 'consideration amount', 'sale value', 'purchase price',
                 'विक्रय राशि', 'विक्रय मूल्य', 'विक्रय प्रतिफल', 'बिक्री राशि'],
    supporting: ['consideration', 'paid a sum', 'for a sum of'],
    transform: (v) => v.replace(/,/g, ''),
  },

  {
    key: 'marketValue', label: 'Market Value', type: 'currency', important: true,
    strong:     ['market value', 'fair market value', 'fmv', 'open market value',
                 'estimated market value',
                 'बाजार मूल्य', 'बाज़ार मूल्य', 'उचित बाजार मूल्य'],
    supporting: ['value of property', 'property value'],
    transform: (v) => v.replace(/,/g, ''),
  },

  {
    key: 'distressValue', label: 'Distress / FSV', type: 'currency', important: true,
    strong:     ['distress value', 'forced sale value', 'fsv', 'distressed value',
                 'realizable value', 'net realizable',
                 'विपदा मूल्य', 'फोर्स्ड सेल वैल्यू'],
    supporting: ['liquidation value', 'auction value'],
    transform: (v) => v.replace(/,/g, ''),
  },

  {
    key: 'taxAmount', label: 'Tax Amount', type: 'currency',
    strong:     ['tax amount', 'total tax', 'tax paid', 'house tax', 'property tax',
                 'कर राशि', 'गृह कर', 'संपत्ति कर'],
    supporting: ['demand', 'amount due', 'tax due'],
    transform: (v) => v.replace(/,/g, ''),
  },

  {
    key: 'tokenAmount', label: 'Token / Advance Amount', type: 'currency',
    strong:     ['token amount', 'earnest money', 'advance amount', 'booking amount',
                 'बयाना', 'अग्रिम राशि', 'टोकन राशि'],
    supporting: ['advance paid', 'deposit'],
    transform: (v) => v.replace(/,/g, ''),
  },

  {
    key: 'loanAmount', label: 'Loan Amount', type: 'currency',
    strong:     ['loan amount', 'sanctioned amount', 'proposed loan', 'mortgage amount',
                 'ऋण राशि', 'स्वीकृत राशि', 'ऋण'],
    supporting: ['bank loan', 'credit limit'],
    transform: (v) => v.replace(/,/g, ''),
  },

  // ── Tax / Assessment ─────────────────────────────────────────────────────────

  {
    key: 'assessmentYear', label: 'Assessment Year', type: 'text',
    strong:     ['assessment year', 'tax year', 'financial year', 'year of assessment',
                 'मूल्यांकन वर्ष', 'कर वर्ष', 'वित्तीय वर्ष'],
    supporting: ['year', 'period'],
    validate: (v) => /\d{4}/.test(v),
  },

  {
    key: 'propertyId', label: 'Property ID / Assessment No.', type: 'text',
    strong:     ['property id', 'assessment no', 'uid', 'unique id', 'holding no',
                 'संपत्ति पहचान', 'मूल्यांकन संख्या', 'होल्डिंग नं'],
    supporting: ['property number'],
  },

  {
    key: 'wardNumber', label: 'Ward No.', type: 'text',
    strong:     ['ward no', 'ward number', 'zone no', 'वार्ड नं', 'वार्ड संख्या'],
    supporting: ['ward'],
  },

  // ── Valuation ────────────────────────────────────────────────────────────────

  {
    key: 'valuationDate', label: 'Valuation Date', type: 'date',
    strong:     ['date of valuation', 'valuation date', 'inspection date', 'site visit',
                 'मूल्यांकन दिनांक', 'निरीक्षण दिनांक'],
    supporting: ['visited on', 'inspection on'],
  },

  {
    key: 'valuerName', label: 'Valuer Name', type: 'text',
    strong:     ['valued by', 'valuer', 'panel valuer', 'approved valuer', 'appraiser',
                 'मूल्यांककर्ता'],
    supporting: ['prepared by', 'report by'],
  },

  {
    key: 'bankName', label: 'Bank / Lender', type: 'text',
    strong:     ['bank', 'lender', 'financial institution', 'branch', 'बैंक', 'ऋणदाता'],
    supporting: ['financer', 'creditor'],
    validate: (v) => v.length < 80,
  },

  // ── Building ─────────────────────────────────────────────────────────────────

  {
    key: 'buildingAge', label: 'Age of Building', type: 'number',
    strong:     ['age of building', 'age of property', 'age of construction', 'building age',
                 'years old', 'भवन की आयु', 'निर्माण आयु'],
    supporting: ['constructed in', 'built in'],
    validate: (v) => { const n = parseInt(v); return !isNaN(n) && n > 0 && n < 200; },
  },

  {
    key: 'numberOfFloors', label: 'Number of Floors', type: 'number',
    strong:     ['number of floors', 'no of floors', 'floors proposed', 'total floors',
                 'मंजिलों की संख्या', 'मंजिल'],
    supporting: ['storey', 'stories'],
    validate: (v) => { const n = parseInt(v); return !isNaN(n) && n > 0 && n < 50; },
  },

  {
    key: 'sanctionNumber', label: 'Sanction / Plan No.', type: 'text',
    strong:     ['sanction no', 'approval no', 'plan no', 'permission no',
                 'स्वीकृति क्रमांक', 'अनुमोदन संख्या', 'नक्शा नं'],
    supporting: ['building permission'],
  },

  // ── Boundaries ───────────────────────────────────────────────────────────────

  {
    key: 'boundaryNorth', label: 'North Boundary', type: 'text',
    strong:     ['north', 'north side', 'northern boundary', 'उत्तर', 'उत्तरी'],
    supporting: ['north:', 'n:'],
  },
  {
    key: 'boundarySouth', label: 'South Boundary', type: 'text',
    strong:     ['south', 'south side', 'southern boundary', 'दक्षिण', 'दक्षिणी'],
    supporting: ['south:', 's:'],
  },
  {
    key: 'boundaryEast', label: 'East Boundary', type: 'text',
    strong:     ['east', 'east side', 'eastern boundary', 'पूर्व', 'पूर्वी'],
    supporting: ['east:', 'e:'],
  },
  {
    key: 'boundaryWest', label: 'West Boundary', type: 'text',
    strong:     ['west', 'west side', 'western boundary', 'पश्चिम', 'पश्चिमी'],
    supporting: ['west:', 'w:'],
  },
];

// Quick lookup by key
export const ENTITY_BY_KEY = new Map<string, EntityField>(
  PROPERTY_ENTITY_DICTIONARY.map(f => [f.key, f]),
);
