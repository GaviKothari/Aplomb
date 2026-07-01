import { DocumentTemplate } from './types';

export const TaxReceiptTemplate: DocumentTemplate = {
  documentType: 'TAX_RECEIPT',
  label: 'Tax Receipt',
  fields: [

    // ── Property Owner ────────────────────────────────────────────────────────
    {
      fieldKey: 'ownerName',
      label: 'Owner Name',
      important: true,
      patterns: [
        /(?:owner|property owner|assessed to|name of owner)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:स्वामी|संपत्ति स्वामी|मालिक|मालिक का नाम)[:\s]+([^\n,]{3,60})/,
        /(?:in the name of|held by)[:\s]+([A-Za-z\s\.]{3,60})/i,
      ],
    },

    // ── Property ID / Assessment Number ──────────────────────────────────────
    {
      fieldKey: 'propertyId',
      label: 'Property ID / Assessment No',
      important: true,
      patterns: [
        /(?:property\s*id|assessment\s*no|property\s*no|uid|unique\s*id|holding\s*no)[\.:\s#]+([A-Za-z0-9\/\-]{1,30})/i,
        /(?:संपत्ति\s*पहचान|मूल्यांकन\s*संख्या|होल्डिंग\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/,
        /(?:no\.?|#)\s*([A-Z0-9\/\-]{4,20})\s*(?:tax|receipt)/i,
      ],
    },

    // ── Ward / Zone ───────────────────────────────────────────────────────────
    {
      fieldKey: 'wardNumber',
      label: 'Ward Number',
      patterns: [
        /(?:ward\s*no|ward\s*number|zone\s*no)[\.:\s#]+([A-Za-z0-9\-]{1,20})/i,
        /(?:वार्ड\s*नं|वार्ड\s*संख्या)[\.:\s]+([A-Za-z0-9\-]{1,20})/,
      ],
    },

    // ── Property Address ──────────────────────────────────────────────────────
    {
      fieldKey: 'propertyAddress',
      label: 'Property Address',
      patterns: [
        /(?:property\s*address|address|located at)[:\s]+([^\n]{10,120})/i,
        /(?:संपत्ति\s*पता|मकान\s*पता)[:\s]+([^\n]{10,100})/,
      ],
    },

    // ── Tax Year / Assessment Year ────────────────────────────────────────────
    {
      fieldKey: 'assessmentYear',
      label: 'Assessment Year',
      important: true,
      patterns: [
        /(?:assessment\s*year|financial\s*year|tax\s*year|year\s*of\s*tax)[:\s]+(\d{4}[-\/]\d{2,4})/i,
        /(?:मूल्यांकन\s*वर्ष|कर\s*वर्ष|वित्तीय\s*वर्ष)[:\s]+(\d{4}[-\/]\d{2,4})/,
        /(?:year)[:\s]+(\d{4}-\d{2,4})/i,
      ],
    },

    // ── Total Tax Amount ──────────────────────────────────────────────────────
    {
      fieldKey: 'taxAmount',
      label: 'Tax Amount',
      important: true,
      patterns: [
        /(?:total\s*tax|tax\s*amount|amount\s*paid|tax\s*due|demand)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:कुल\s*कर|कर\s*राशि|देय\s*राशि)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
        /(?:rs\.?|₹)\s*([\d,]+)\s*(?:paid|only|\/\-)/i,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Annual Value ──────────────────────────────────────────────────────────
    {
      fieldKey: 'annualValue',
      label: 'Annual Value',
      patterns: [
        /(?:annual\s*value|rateable\s*value|arv)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:वार्षिक\s*मूल्य|कर\s*योग्य\s*मूल्य)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Issuing Authority ─────────────────────────────────────────────────────
    {
      fieldKey: 'issuingAuthority',
      label: 'Issuing Authority',
      patterns: [
        /(?:municipal\s*corporation|nagar\s*nigam|nagar\s*palika|nagar\s*panchayat|mcd|mch|municipal\s*council)[:\s,]+([A-Za-z\s]{2,50})?/i,
        /(?:नगर\s*निगम|नगर\s*पालिका|नगर\s*पंचायत)[:\s,]+([^\n,]{2,50})?/,
      ],
    },

    // ── Receipt Number ────────────────────────────────────────────────────────
    {
      fieldKey: 'receiptNumber',
      label: 'Receipt Number',
      patterns: [
        /(?:receipt\s*no|receipt\s*number)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/i,
        /(?:रसीद\s*नं|रसीद\s*संख्या)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/,
      ],
    },

    // ── Payment Date ──────────────────────────────────────────────────────────
    {
      fieldKey: 'paymentDate',
      label: 'Payment Date',
      patterns: [
        /(?:date of payment|paid on|payment date|receipt date)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:भुगतान\s*दिनांक|भुगतान\s*की\s*तारीख)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
        /(?:dated?)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      ],
    },

    // ── Area / Plinth Area ────────────────────────────────────────────────────
    {
      fieldKey: 'plinthArea',
      label: 'Plinth Area',
      patterns: [
        /(?:plinth\s*area|built[\s-]?up\s*area|floor\s*area)[:\s]+(\d[\d,\.]*\s*(?:sq\.?\s*(?:ft|m|meter|feet)|sqft|sqm))/i,
        /(?:प्लिंथ\s*क्षेत्र|निर्मित\s*क्षेत्र)[:\s]+(\d[\d,\.]*\s*(?:वर्ग\s*(?:फुट|मीटर)|sq[\w\s]*))/,
      ],
    },
  ],
};
