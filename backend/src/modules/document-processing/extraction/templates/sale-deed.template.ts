import { DocumentTemplate } from './types';

export const SaleDeedTemplate: DocumentTemplate = {
  documentType: 'SALE_DEED',
  label: 'Sale Deed',
  fields: [

    // ── Vendor / Seller ──────────────────────────────────────────────────────
    {
      fieldKey: 'vendorName',
      label: 'Vendor / Seller',
      important: true,
      patterns: [
        /(?:vendor|seller|transferor|executant|first party)[:\s]+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:विक्रेता|बिक्रेता|प्रथम पक्ष)[:\s]+([^\n,]{3,60})/,
        /(?:sold by|conveyed by)\s+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:I|We)[,\s]+([A-Z][A-Za-z\s\.]+),?\s+(?:son|daughter|wife|S\/O|D\/O|W\/O)/i,
        /([A-Z][A-Za-z\s\.]+),?\s+S\/O\.?\s+[A-Z]/i,
      ],
    },

    // ── Buyer / Purchaser ─────────────────────────────────────────────────────
    {
      fieldKey: 'purchaserName',
      label: 'Buyer / Purchaser',
      important: true,
      patterns: [
        /(?:purchaser|buyer|transferee|second party)[:\s]+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:क्रेता|खरीदार|द्वितीय पक्ष)[:\s]+([^\n,]{3,60})/,
        /(?:purchased by|acquired by)\s+([A-Z][A-Za-z\s\.]{3,60})/i,
        /sold to\s+([A-Z][A-Za-z\s\.]+)/i,
      ],
    },

    // ── Property Address ──────────────────────────────────────────────────────
    {
      fieldKey: 'propertyAddress',
      label: 'Property Address',
      important: true,
      patterns: [
        /(?:property situated at|property known as|property described as|situated at)[:\s]+([^\n]{10,120})/i,
        /(?:संपत्ति स्थित|मकान स्थित)[:\s]+([^\n]{10,100})/,
        /(?:All that|all that piece and parcel)[^\n]{0,20}([A-Za-z\d\s,\-\.\/]{10,100})/i,
      ],
    },

    // ── House / Property Number ───────────────────────────────────────────────
    {
      fieldKey: 'houseNumber',
      label: 'House / Flat Number',
      patterns: [
        /(?:house\s*no|h\.?\s*no|flat\s*no|property\s*no|door\s*no)[\.:\s#]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:मकान\s*नं|मकान\s*नंबर|भवन\s*संख्या|फ्लैट\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
        /(?:Plot\s*No|Plot\s*Number)[\.:\s#]+([A-Za-z0-9\/\-]{1,20})/i,
      ],
    },

    // ── Khasra / Survey Number ────────────────────────────────────────────────
    {
      fieldKey: 'khasraNumber',
      label: 'Khasra / Survey Number',
      patterns: [
        /(?:khasra\s*no|khasra\s*number|survey\s*no|gata\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:खसरा\s*नं|खसरा\s*संख्या|गाटा\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Khata Number ─────────────────────────────────────────────────────────
    {
      fieldKey: 'khataNumber',
      label: 'Khata Number',
      patterns: [
        /(?:khata\s*no|khata\s*number|khatauni\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:खाता\s*नं|खतौनी\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Area ──────────────────────────────────────────────────────────────────
    {
      fieldKey: 'totalArea',
      label: 'Total Area',
      important: true,
      patterns: [
        /(?:total\s*area|land\s*area|plot\s*area|area\s*of\s*plot|admeasuring|measuring)[:\s]+(\d[\d,\.]*\s*(?:sq\.?\s*(?:ft|yd|m|meter|feet|yard)|sqft|sqyd|sqm|square\s*(?:feet|yard|meter)|marla|kanal|bigha|acre|gaj|वर्ग|sq)[\w\s\.]*)/i,
        /(?:क्षेत्रफल|रकबा|भूखंड\s*क्षेत्र)[:\s]+(\d[\d,\.]*\s*(?:वर्ग\s*(?:फुट|गज|मीटर)|बीघा|मरला|एकड़|sq[\w\s]*))/,
        /(\d[\d,\.]+)\s*(?:sq\.?\s*(?:ft|yd|m)|sqft|sqyd|square\s*(?:feet|yard))/i,
      ],
    },

    // ── Registration Date ─────────────────────────────────────────────────────
    {
      fieldKey: 'registrationDate',
      label: 'Registration Date',
      important: true,
      patterns: [
        /(?:registered on|date of registration|executed on|dated|registration date)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:registered on|dated)[:\s]+(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
        /(?:पंजीयन\s*दिनांक|पंजीकरण\s*तारीख)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
        /(?:this deed is executed on|this deed executed)[^\n]{0,20}(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
      ],
    },

    // ── Registry / Document Number ────────────────────────────────────────────
    {
      fieldKey: 'registrationNumber',
      label: 'Registration Number',
      important: true,
      patterns: [
        /(?:document\s*no|registration\s*no|deed\s*no|book\s*no|reg\.?\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/i,
        /(?:पंजीयन\s*क्रमांक|दस्तावेज\s*क्रमांक|रजिस्ट्री\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/,
        /(?:serial\s*no|vol\.?\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/i,
      ],
    },

    // ── Sale Amount / Consideration ───────────────────────────────────────────
    {
      fieldKey: 'saleAmount',
      label: 'Sale Amount',
      patterns: [
        /(?:sale\s*consideration|consideration\s*of|sale\s*price|agreed\s*sale\s*price|total\s*consideration)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:for\s+a\s+consideration|paid\s+a\s+sum)[^\n]{0,20}(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:विक्रय\s*राशि|विक्रय\s*मूल्य|बिक्री\s*राशि)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
        /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{2})?)\s*(?:only|\/\-|total)/i,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Sub-Registrar Office ──────────────────────────────────────────────────
    {
      fieldKey: 'subRegistrarOffice',
      label: 'Sub-Registrar Office',
      patterns: [
        /(?:sub[\s-]registrar|sr\s+office)[:\s,]+([A-Za-z\s]{3,50})/i,
        /(?:office of the sub[\s-]registrar)[:\s,]+([A-Za-z\s]{3,50})/i,
        /(?:उप\s*पंजीयक|उप-पंजीयक)[:\s,]+([^\n,]{3,50})/,
      ],
    },

    // ── Boundaries ───────────────────────────────────────────────────────────
    {
      fieldKey: 'boundaryNorth',
      label: 'North Boundary',
      patterns: [
        /(?:north|north[\s-]?side|north\s+boundary|उत्तर)[:\s\-]+([^\n,;]{3,80})/i,
      ],
    },
    {
      fieldKey: 'boundarySouth',
      label: 'South Boundary',
      patterns: [
        /(?:south|south[\s-]?side|south\s+boundary|दक्षिण)[:\s\-]+([^\n,;]{3,80})/i,
      ],
    },
    {
      fieldKey: 'boundaryEast',
      label: 'East Boundary',
      patterns: [
        /(?:east|east[\s-]?side|east\s+boundary|पूर्व)[:\s\-]+([^\n,;]{3,80})/i,
      ],
    },
    {
      fieldKey: 'boundaryWest',
      label: 'West Boundary',
      patterns: [
        /(?:west|west[\s-]?side|west\s+boundary|पश्चिम)[:\s\-]+([^\n,;]{3,80})/i,
      ],
    },

    // ── Property Type ─────────────────────────────────────────────────────────
    {
      fieldKey: 'propertyType',
      label: 'Property Type',
      patterns: [
        /(?:residential\s+(?:flat|house|plot|floor|apartment|unit)|commercial\s+(?:shop|office|space)|(?:flat|apartment|house|plot|villa|bungalow)\s+no)/i,
        /(?:संपत्ति\s+का\s+प्रकार|संपत्ति\s+प्रकार)[:\s]+([^\n,]{3,50})/,
      ],
    },

    // ── Village / Locality ────────────────────────────────────────────────────
    {
      fieldKey: 'locality',
      label: 'Locality / Area',
      patterns: [
        /(?:locality|area|sector|colony|nagar|vihar|enclave|block|pocket)[:\s#]+([A-Za-z0-9\s\-]{2,40})(?:[,\n])/i,
        /(?:मोहल्ला|इलाका|सेक्टर|कॉलोनी|नगर)[:\s]+([^\n,]{3,40})/,
      ],
    },

    // ── Pincode ───────────────────────────────────────────────────────────────
    {
      fieldKey: 'pincode',
      label: 'Pincode',
      patterns: [
        /(?:pin|pincode|pin\s*code|postal\s*code)[:\s\-]+(\d{6})/i,
        /\b(\d{6})\b/,
      ],
      transform: (v) => v.replace(/\D/g, '').slice(0, 6),
    },
  ],
};
