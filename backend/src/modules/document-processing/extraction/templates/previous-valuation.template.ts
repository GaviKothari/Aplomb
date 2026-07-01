import { DocumentTemplate } from './types';

export const PreviousValuationTemplate: DocumentTemplate = {
  documentType: 'PREVIOUS_VALUATION',
  label: 'Previous Valuation',
  fields: [

    // ── Market Value ──────────────────────────────────────────────────────────
    {
      fieldKey: 'marketValue',
      label: 'Market Value',
      important: true,
      patterns: [
        /(?:market\s*value|fair\s*market\s*value|fmv|estimated\s*value|open\s*market\s*value)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:बाजार\s*मूल्य|बाज़ार\s*मूल्य|उचित\s*बाजार\s*मूल्य)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Distress / Forced Sale Value ──────────────────────────────────────────
    {
      fieldKey: 'distressValue',
      label: 'Distress / Forced Sale Value',
      important: true,
      patterns: [
        /(?:distress\s*value|forced\s*sale\s*value|fsv|distressed\s*value|realizable\s*value)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:विपदा\s*मूल्य|विक्रय\s*मूल्य)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Valuer Name ───────────────────────────────────────────────────────────
    {
      fieldKey: 'valuerName',
      label: 'Valuer Name',
      important: true,
      patterns: [
        /(?:valued by|valuer|appraiser|panel valuer|approved valuer)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:मूल्यांककर्ता|मूल्यांकनकर्ता)[:\s]+([^\n,]{3,60})/,
      ],
    },

    // ── Valuation Date ────────────────────────────────────────────────────────
    {
      fieldKey: 'valuationDate',
      label: 'Valuation Date',
      important: true,
      patterns: [
        /(?:date\s*of\s*valuation|valuation\s*date|inspection\s*date|site\s*visit\s*on)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:मूल्यांकन\s*दिनांक|निरीक्षण\s*दिनांक)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
      ],
    },

    // ── Land Value ────────────────────────────────────────────────────────────
    {
      fieldKey: 'landValue',
      label: 'Land Value',
      patterns: [
        /(?:land\s*value|value\s*of\s*land|plot\s*value)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:भूमि\s*मूल्य|भूखंड\s*मूल्य)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Building / Construction Value ─────────────────────────────────────────
    {
      fieldKey: 'buildingValue',
      label: 'Building Value',
      patterns: [
        /(?:building\s*value|structure\s*value|construction\s*value|improvement\s*value)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:भवन\s*मूल्य|निर्माण\s*मूल्य)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Plinth Area ───────────────────────────────────────────────────────────
    {
      fieldKey: 'plinthArea',
      label: 'Plinth Area',
      patterns: [
        /(?:plinth\s*area|built[\s-]?up\s*area|constructed\s*area|super\s*built[\s-]?up)[:\s]+(\d[\d,\.]*\s*(?:sq\.?\s*(?:ft|m|meter|feet)|sqft|sqm))/i,
        /(?:प्लिंथ\s*क्षेत्र|निर्मित\s*क्षेत्र)[:\s]+(\d[\d,\.]*\s*(?:वर्ग\s*(?:फुट|मीटर)|sq[\w\s]*))/,
      ],
    },

    // ── Property Type ─────────────────────────────────────────────────────────
    {
      fieldKey: 'propertyType',
      label: 'Property Type',
      patterns: [
        /(?:type\s*of\s*property|property\s*type)[:\s]+([A-Za-z\s\/]{3,40})/i,
        /(?:संपत्ति\s*का\s*प्रकार|संपत्ति\s*प्रकार)[:\s]+([^\n,]{3,40})/,
        /(?:residential|commercial|industrial|agricultural)\s+(?:land|plot|flat|house|shop|office)/i,
      ],
    },

    // ── Age of Building ───────────────────────────────────────────────────────
    {
      fieldKey: 'buildingAge',
      label: 'Age of Building (years)',
      patterns: [
        /(?:age\s*of\s*(?:building|property|construction)|years\s*old)[:\s]+(\d{1,3}(?:\.\d{1,2})?)\s*(?:years?)?/i,
        /(?:भवन\s*की\s*आयु|निर्माण\s*आयु)[:\s]+(\d{1,3})\s*(?:वर्ष)?/,
      ],
    },

    // ── Depreciation ──────────────────────────────────────────────────────────
    {
      fieldKey: 'depreciation',
      label: 'Depreciation (%)',
      patterns: [
        /(?:depreciation)[:\s]+(\d{1,3}(?:\.\d{1,2})?)\s*%/i,
        /(?:मूल्यह्रास|अवमूल्यन)[:\s]+(\d{1,3}(?:\.\d{1,2})?)\s*%?/,
      ],
    },

    // ── Loan Amount ───────────────────────────────────────────────────────────
    {
      fieldKey: 'loanAmount',
      label: 'Loan / Mortgage Amount',
      patterns: [
        /(?:loan\s*amount|proposed\s*loan|mortgage\s*amount|bank\s*loan)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:ऋण\s*राशि|बैंक\s*ऋण|मॉर्गेज)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Bank / Purpose ────────────────────────────────────────────────────────
    {
      fieldKey: 'bankName',
      label: 'Bank / Financial Institution',
      patterns: [
        /(?:bank|lender|financial\s*institution)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:बैंक|वित्तीय\s*संस्था)[:\s]+([^\n,]{3,60})/,
        /(?:sbi|hdfc|icici|pnb|bank of india|union bank|canara bank|axis bank|idbi|kotak|yes bank|bob|boi|central bank)[^\n]{0,30}/i,
      ],
    },
  ],
};
