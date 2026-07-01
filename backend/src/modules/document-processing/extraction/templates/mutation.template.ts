import { DocumentTemplate } from './types';

export const MutationTemplate: DocumentTemplate = {
  documentType: 'MUTATION',
  label: 'Mutation / Khatauni',
  fields: [

    // ── Khata / Khatauni Number ───────────────────────────────────────────────
    {
      fieldKey: 'khataNumber',
      label: 'Khata Number',
      important: true,
      patterns: [
        /(?:khata\s*no|khatauni\s*no|khata\s*number)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:खाता\s*नं|खतौनी\s*नं|खाता\s*संख्या)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Khasra Number ─────────────────────────────────────────────────────────
    {
      fieldKey: 'khasraNumber',
      label: 'Khasra Number',
      important: true,
      patterns: [
        /(?:khasra\s*no|survey\s*no|gata\s*no|khasra\s*number)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:खसरा\s*नं|खसरा\s*संख्या|गाटा\s*नं|सर्वे\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Owner / Bhoomidhar ────────────────────────────────────────────────────
    {
      fieldKey: 'ownerName',
      label: 'Owner / Bhoomidhar Name',
      important: true,
      patterns: [
        /(?:owner|bhoomidhar|recorded in the name of|cultivator|occupant)[:\s]+([A-Za-z\s\.]{3,60})/i,
        /(?:भूमिधर|काश्तकार|स्वामी|दर्ज\s+नाम)[:\s]+([^\n,]{3,60})/,
        /(?:नाम)[:\s]+([^\n,]{3,60})(?:\s+पुत्र|\s+पत्नी|\s+पुत्री)/,
      ],
    },

    // ── Village / Gram ────────────────────────────────────────────────────────
    {
      fieldKey: 'villageName',
      label: 'Village / Gram',
      important: true,
      patterns: [
        /(?:village|gram|mauza|mahal)[:\s]+([A-Za-z\s]{2,40})/i,
        /(?:ग्राम|गांव|मौज़ा|महाल)[:\s]+([^\n,]{2,40})/,
      ],
    },

    // ── Tehsil ────────────────────────────────────────────────────────────────
    {
      fieldKey: 'tehsil',
      label: 'Tehsil',
      patterns: [
        /(?:tehsil|taluka|taluq)[:\s]+([A-Za-z\s]{2,40})/i,
        /(?:तहसील|तालुका)[:\s]+([^\n,]{2,40})/,
      ],
    },

    // ── District ──────────────────────────────────────────────────────────────
    {
      fieldKey: 'district',
      label: 'District',
      patterns: [
        /(?:district|zila)[:\s]+([A-Za-z\s]{2,40})/i,
        /(?:जिला|जिला\s+नाम)[:\s]+([^\n,]{2,40})/,
      ],
    },

    // ── Land Area ─────────────────────────────────────────────────────────────
    {
      fieldKey: 'landArea',
      label: 'Land Area',
      important: true,
      patterns: [
        /(?:area|land\s*area|raqba|ruqba)[:\s]+(\d[\d,\.]*\s*(?:hectare|bigha|acre|biswa|marla|kanal|sq[\w\s\.]*)?)/i,
        /(?:क्षेत्रफल|रकबा|भूमि\s*क्षेत्र)[:\s]+(\d[\d,\.]*\s*(?:हेक्टेयर|बीघा|एकड़|बिस्वा|मरला|वर्ग[\w\s]*))/,
      ],
    },

    // ── Land Type / Bhumi Classification ──────────────────────────────────────
    {
      fieldKey: 'landType',
      label: 'Land Type',
      patterns: [
        /(?:nature\s*of\s*land|land\s*type|land\s*use|tenure|khata\s*type)[:\s]+([A-Za-z\s]{2,40})/i,
        /(?:भूमि\s*प्रकार|भूमि\s*श्रेणी|श्रेणी)[:\s]+([^\n,]{2,40})/,
        /(?:कृषि|आवासीय|व्यावसायिक|बंजर|सिंचित|असिंचित)/,
      ],
    },

    // ── Mutation Number ───────────────────────────────────────────────────────
    {
      fieldKey: 'mutationNumber',
      label: 'Mutation Number',
      patterns: [
        /(?:mutation\s*no|intkal\s*no|dakhil\s*kharij\s*no)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/i,
        /(?:नामांतरण\s*क्रमांक|इंतकाल\s*नं|दाखिल\s*खारिज\s*नं)[\.:\s]+([A-Za-z0-9\/\-]{1,20})/,
      ],
    },

    // ── Patwari / Revenue Officer ──────────────────────────────────────────────
    {
      fieldKey: 'patwariName',
      label: 'Patwari / Revenue Officer',
      patterns: [
        /(?:patwari|lekhpal|revenue\s*inspector|naib\s*tehsildar)[:\s]+([A-Za-z\s\.]{2,40})/i,
        /(?:पटवारी|लेखपाल|राजस्व\s*निरीक्षक|नायब\s*तहसीलदार)[:\s]+([^\n,]{2,40})/,
      ],
    },

    // ── Date of Mutation ──────────────────────────────────────────────────────
    {
      fieldKey: 'mutationDate',
      label: 'Mutation Date',
      patterns: [
        /(?:date of mutation|mutation date|dated)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
        /(?:नामांतरण\s*दिनांक|तारीख)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
      ],
    },
  ],
};
