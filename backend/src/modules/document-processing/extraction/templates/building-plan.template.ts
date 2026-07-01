import { DocumentTemplate } from './types';

export const BuildingPlanTemplate: DocumentTemplate = {
  documentType: 'BUILDING_PLAN',
  label: 'Building Plan',
  fields: [

    // ── Owner / Applicant ─────────────────────────────────────────────────────
    {
      fieldKey: 'ownerName',
      label: 'Owner / Applicant Name',
      important: true,
      patterns: [
        /(?:owner|applicant|applied by|in the name of)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:स्वामी|आवेदक|आवेदनकर्ता)[:\s]+([^\n,]{3,60})/,
      ],
    },

    // ── Site / Plot Address ───────────────────────────────────────────────────
    {
      fieldKey: 'siteAddress',
      label: 'Site Address',
      important: true,
      patterns: [
        /(?:site\s*address|plot\s*address|location|situated\s*at|site\s*located)[:\s]+([^\n]{10,120})/i,
        /(?:भूखंड\s*पता|स्थल\s*पता|स्थान)[:\s]+([^\n]{10,100})/,
      ],
    },

    // ── Plot Number ───────────────────────────────────────────────────────────
    {
      fieldKey: 'plotNumber',
      label: 'Plot Number',
      patterns: [
        /(?:plot\s*no|plot\s*number|khasra\s*no)[\.:\s#]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:भूखंड\s*नं|प्लॉट\s*नं|खसरा\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Sanction / Approval Number ────────────────────────────────────────────
    {
      fieldKey: 'sanctionNumber',
      label: 'Sanction / Approval Number',
      important: true,
      patterns: [
        /(?:sanction\s*no|approval\s*no|plan\s*no|permission\s*no|file\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/i,
        /(?:स्वीकृति\s*क्रमांक|अनुमोदन\s*संख्या|नक्शा\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,30})/,
      ],
    },

    // ── Sanction Date ─────────────────────────────────────────────────────────
    {
      fieldKey: 'sanctionDate',
      label: 'Sanction Date',
      patterns: [
        /(?:sanctioned\s*on|approved\s*on|sanction\s*date|date\s*of\s*sanction|date\s*of\s*approval)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:स्वीकृति\s*दिनांक|अनुमोदन\s*तारीख)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
      ],
    },

    // ── Issuing Authority ─────────────────────────────────────────────────────
    {
      fieldKey: 'issuingAuthority',
      label: 'Approving Authority',
      patterns: [
        /(?:municipal\s*corporation|nagar\s*nigam|development\s*authority|urban\s*improvement\s*trust|uit|jda|dda|huda|gda|mcd)[^\n]{0,30}/i,
        /(?:नगर\s*निगम|विकास\s*प्राधिकरण)[:\s,]+([^\n,]{2,50})?/,
      ],
    },

    // ── Plot Area ─────────────────────────────────────────────────────────────
    {
      fieldKey: 'plotArea',
      label: 'Plot Area',
      important: true,
      patterns: [
        /(?:plot\s*area|land\s*area|site\s*area)[:\s]+(\d[\d,\.]*\s*(?:sq\.?\s*(?:ft|yd|m|meter|feet|yard)|sqft|sqyd|sqm|marla|kanal)[\w\s\.]*)/i,
        /(?:भूखंड\s*क्षेत्र|प्लॉट\s*क्षेत्र)[:\s]+(\d[\d,\.]*\s*(?:वर्ग\s*(?:फुट|गज|मीटर)|sq[\w\s]*))/,
      ],
    },

    // ── FAR / FSI ─────────────────────────────────────────────────────────────
    {
      fieldKey: 'far',
      label: 'FAR / FSI',
      patterns: [
        /(?:far|fsi|floor\s*area\s*ratio|floor\s*space\s*index)[:\s]+(\d+(?:\.\d{1,2})?)/i,
        /(?:फ्लोर\s*एरिया\s*रेशियो)[:\s]+(\d+(?:\.\d{1,2})?)/,
      ],
    },

    // ── Ground Coverage ───────────────────────────────────────────────────────
    {
      fieldKey: 'groundCoverage',
      label: 'Ground Coverage',
      patterns: [
        /(?:ground\s*coverage|coverage\s*area|ground\s*floor\s*coverage)[:\s]+(\d[\d,\.]*\s*(?:%|sq\.?\s*(?:ft|m)|sqft|sqm)?)/i,
        /(?:भूतल\s*आवरण)[:\s]+(\d[\d,\.]*\s*(?:%|वर्ग\s*(?:फुट|मीटर))?)/,
      ],
    },

    // ── Number of Floors ──────────────────────────────────────────────────────
    {
      fieldKey: 'numberOfFloors',
      label: 'Number of Floors',
      patterns: [
        /(?:number\s*of\s*floors?|no\.\s*of\s*floors?|floors?\s*proposed|total\s*floors?)[:\s]+(\d{1,2})/i,
        /(?:मंजिलों\s*की\s*संख्या|मंजिल)[:\s]+(\d{1,2})/,
        /(?:g\+(\d)|ground\s*\+\s*(\d))/i,
      ],
    },

    // ── Architect Name ────────────────────────────────────────────────────────
    {
      fieldKey: 'architectName',
      label: 'Architect Name',
      patterns: [
        /(?:architect|designed\s*by|prepared\s*by)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:वास्तुकार|वास्तुविद)[:\s]+([^\n,]{3,60})/,
      ],
    },
  ],
};
