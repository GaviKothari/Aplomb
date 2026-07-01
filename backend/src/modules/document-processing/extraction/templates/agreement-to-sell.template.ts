import { DocumentTemplate } from './types';

export const AgreementToSellTemplate: DocumentTemplate = {
  documentType: 'AGREEMENT_TO_SELL',
  label: 'Agreement to Sell',
  fields: [

    // ── Seller ────────────────────────────────────────────────────────────────
    {
      fieldKey: 'sellerName',
      label: 'Seller / Vendor',
      important: true,
      patterns: [
        /(?:seller|vendor|first party|party of the first part)[:\s]+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:विक्रेता|प्रथम पक्ष|बेचने वाला)[:\s]+([^\n,]{3,60})/,
        /(?:I|We)[,\s]+([A-Z][A-Za-z\s\.]+),?\s+(?:son|daughter|wife|S\/O|D\/O|W\/O)/i,
      ],
    },

    // ── Buyer ─────────────────────────────────────────────────────────────────
    {
      fieldKey: 'buyerName',
      label: 'Buyer / Purchaser',
      important: true,
      patterns: [
        /(?:buyer|purchaser|second party|party of the second part)[:\s]+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:क्रेता|द्वितीय पक्ष|खरीदने वाला)[:\s]+([^\n,]{3,60})/,
      ],
    },

    // ── Property Address ──────────────────────────────────────────────────────
    {
      fieldKey: 'propertyAddress',
      label: 'Property Address',
      important: true,
      patterns: [
        /(?:property\s*situated|property\s*known\s*as|property\s*described|situated\s*at)[:\s]+([^\n]{10,120})/i,
        /(?:संपत्ति\s*स्थित|मकान\s*स्थित)[:\s]+([^\n]{10,100})/,
      ],
    },

    // ── Total Sale Price ──────────────────────────────────────────────────────
    {
      fieldKey: 'totalSalePrice',
      label: 'Total Sale Price',
      important: true,
      patterns: [
        /(?:total\s*sale\s*price|agreed\s*price|sale\s*price|total\s*consideration|consideration\s*amount)[:\s]+(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:विक्रय\s*मूल्य|विक्रय\s*राशि|कुल\s*राशि)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
        /(?:for\s+a\s+sum)[^\n]{0,20}(?:rs\.?|₹)\s*([\d,]+)/i,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Token / Earnest Money ─────────────────────────────────────────────────
    {
      fieldKey: 'tokenAmount',
      label: 'Token / Earnest Money',
      patterns: [
        /(?:token\s*amount|earnest\s*money|advance\s*amount|advance\s*paid|booking\s*amount)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:बयाना\s*राशि|अग्रिम\s*राशि|टोकन\s*राशि)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Balance Amount ────────────────────────────────────────────────────────
    {
      fieldKey: 'balanceAmount',
      label: 'Balance Amount',
      patterns: [
        /(?:balance\s*amount|remaining\s*amount|balance\s*consideration|balance\s*payment)[:\s]+(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
        /(?:शेष\s*राशि|बाकी\s*राशि)[:\s]+(?:रु\.?|₹)?\s*([\d,]+)/,
      ],
      transform: (v) => v.replace(/,/g, ''),
    },

    // ── Date of Agreement ─────────────────────────────────────────────────────
    {
      fieldKey: 'agreementDate',
      label: 'Date of Agreement',
      patterns: [
        /(?:date\s*of\s*agreement|agreement\s*date|executed\s*on|this\s*agreement\s*dated)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:करार\s*दिनांक|अनुबंध\s*तारीख)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
        /(?:dated?|on\s+this)[:\s]+(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
      ],
    },

    // ── Registry Deadline ─────────────────────────────────────────────────────
    {
      fieldKey: 'registryDeadline',
      label: 'Registry Deadline',
      patterns: [
        /(?:registry\s*(?:within|by|before)|sale\s*deed\s*(?:within|by|before)|complete\s*sale\s*(?:within|by|before))[^\n]{0,20}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d+\s*(?:month|year|day)s?)/i,
        /(?:within\s+(\d+\s*(?:month|year|day)s?))/i,
        /(?:पंजीयन\s*(?:अवधि|समय|तारीख))[:\s]+([^\n,]{3,40})/,
      ],
    },

    // ── Area ──────────────────────────────────────────────────────────────────
    {
      fieldKey: 'totalArea',
      label: 'Total Area',
      patterns: [
        /(?:total\s*area|area|admeasuring|measuring)[:\s]+(\d[\d,\.]*\s*(?:sq\.?\s*(?:ft|yd|m|meter|feet|yard)|sqft|sqyd|sqm|marla|kanal|bigha|acre|gaj)[\w\s\.]*)/i,
        /(?:क्षेत्रफल|रकबा)[:\s]+(\d[\d,\.]*\s*(?:वर्ग\s*(?:फुट|गज|मीटर)|बीघा|मरला|एकड़|sq[\w\s]*))/,
      ],
    },

    // ── Khasra / House Number ─────────────────────────────────────────────────
    {
      fieldKey: 'houseNumber',
      label: 'House / Plot Number',
      patterns: [
        /(?:house\s*no|h\.?\s*no|flat\s*no|property\s*no|plot\s*no)[\.:\s#]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:मकान\s*नं|भवन\s*संख्या|फ्लैट\s*नं|प्लॉट\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Witness ───────────────────────────────────────────────────────────────
    {
      fieldKey: 'witnessName',
      label: 'Witness Name',
      patterns: [
        /(?:witness|witnessed by|in the presence of)[:\s]+([A-Z][A-Za-z\s\.]{3,60})/i,
        /(?:गवाह|साक्षी)[:\s]+([^\n,]{3,60})/,
      ],
    },
  ],
};
