/**
 * Keyword-based document classifier.
 * No AI — uses weighted keyword matching against known document signatures.
 */

export type KnownDocType =
  | 'SALE_DEED'
  | 'REGISTRY'
  | 'AGREEMENT_TO_SELL'
  | 'PREVIOUS_VALUATION'
  | 'TAX_RECEIPT'
  | 'MUTATION'
  | 'BUILDING_PLAN'
  | 'SANCTION_LETTER'
  | 'ALLOTMENT_LETTER'
  | 'POSSESSION_LETTER'
  | 'CHAIN_OF_TITLE'
  | 'OCCUPANCY_CERTIFICATE'
  | 'OTHER';

export interface ClassificationResult {
  documentType:   KnownDocType;
  confidence:     number;     // 0–1
  matchedKeywords: string[];
  alternativeType?: KnownDocType;
}

interface DocSignature {
  label:        string;
  strong:       string[];   // weight 3 each
  supporting:   string[];   // weight 1 each
  negative:     string[];   // disqualifying keywords (reduce score)
  minScore:     number;     // minimum weighted score to claim this type
}

const SIGNATURES: Record<KnownDocType, DocSignature> = {

  SALE_DEED: {
    label: 'Sale Deed',
    strong: [
      // English
      'sale deed', 'conveyance deed', 'transfer deed', 'deed of sale',
      'vendor', 'purchaser', 'transferor', 'transferee',
      'sub-registrar', 'sub registrar',
      // Hindi
      'विक्रय पत्र', 'विक्रय-पत्र', 'क्रय विक्रय', 'विक्रेता', 'क्रेता',
      'उप पंजीयक', 'उप-पंजीयक', 'पंजीयन कार्यालय',
    ],
    supporting: [
      'sale consideration', 'stamp duty', 'registration fee', 'conveyance',
      'absolute sale', 'freehold', 'stridhan', 'gift deed',
      'स्टाम्प शुल्क', 'पंजीकरण शुल्क', 'विक्रय मूल्य', 'बिक्री',
      'गवाह', 'witness', 'execution', 'executant',
    ],
    negative: ['agreement to sell', 'agreement for sale', 'बिक्री करार'],
    minScore: 6,
  },

  REGISTRY: {
    label: 'Registry',
    strong: [
      'registry', 'registered deed', 'book no', 'volume no', 'series no',
      'पंजीयन', 'रजिस्ट्री', 'दस्तावेज क्रमांक', 'पुस्तक क्रमांक',
    ],
    supporting: [
      'document no', 'registration no', 'deed no', 'registered on',
      'पंजीयन संख्या', 'दस्तावेज़', 'stamp paper',
    ],
    negative: [],
    minScore: 4,
  },

  AGREEMENT_TO_SELL: {
    label: 'Agreement to Sell',
    strong: [
      'agreement to sell', 'agreement for sale', 'sale agreement',
      'memorandum of understanding', 'mou', 'deed of agreement',
      'बिक्री करार', 'करार पत्र', 'विक्रय करार', 'अनुबंध पत्र',
    ],
    supporting: [
      'token amount', 'advance', 'earnest money', 'balance amount',
      'seller agrees', 'buyer agrees', 'consideration',
      'बयाना', 'अग्रिम', 'शेष राशि',
    ],
    negative: ['sub-registrar', 'registered on', 'stamp paper no'],
    minScore: 4,
  },

  PREVIOUS_VALUATION: {
    label: 'Previous Valuation',
    strong: [
      'valuation report', 'valuation certificate', 'technical report',
      'market value', 'fair market value', 'distress value',
      'मूल्यांकन', 'मूल्यांकन रिपोर्ट', 'बाजार मूल्य', 'विपणन मूल्य',
      'distressed value', 'forced sale value',
    ],
    supporting: [
      'net present value', 'construction cost', 'depreciation',
      'realizable value', 'replacement cost', 'income approach',
      'comparable', 'site observation', 'plinth area',
      'निर्माण लागत', 'मूल्यह्रास', 'अवमूल्यन',
      'bank loan', 'loan amount', 'mortgage', 'collateral',
    ],
    negative: [],
    minScore: 5,
  },

  TAX_RECEIPT: {
    label: 'Tax Receipt',
    strong: [
      'house tax', 'property tax', 'municipal tax', 'tax receipt',
      'tax paid', 'payment receipt', 'mcd', 'mch', 'nagar nigam', 'nagar palika',
      'गृह कर', 'संपत्ति कर', 'नगर निगम', 'नगर पालिका', 'कर रसीद',
      'bhumi mitra', 'bhulekh', 'bhumi',
    ],
    supporting: [
      'demand notice', 'assessment year', 'financial year', 'ward no',
      'annual value', 'rateable value', 'zone',
      'वार्ड', 'कर वर्ष', 'वार्षिक मूल्य',
      'water tax', 'sewerage tax', 'conservancy',
    ],
    negative: [],
    minScore: 4,
  },

  MUTATION: {
    label: 'Mutation / Khatauni',
    strong: [
      'mutation', 'khatauni', 'jamabandi', 'nakal', 'intkal',
      'revenue record', 'land record', 'patwari',
      'नामांतरण', 'खतौनी', 'जमाबंदी', 'नकल', 'इंतकाल',
      'राजस्व अभिलेख', 'पटवारी', 'तहसीलदार',
      'khasra', 'khata', 'survey no', 'gata no',
      'खसरा', 'खाता', 'गाटा', 'सर्वे नं',
    ],
    supporting: [
      'tehsil', 'district', 'village', 'gram', 'circle',
      'तहसील', 'जिला', 'ग्राम', 'गांव', 'हल्का',
      'bhumi', 'bhoomi', 'bhoomidhar',
      'भूमि', 'भूमिधर', 'किसान',
    ],
    negative: [],
    minScore: 4,
  },

  BUILDING_PLAN: {
    label: 'Building Plan',
    strong: [
      'building plan', 'floor plan', 'layout plan', 'site plan', 'sanctioned plan',
      'approved plan', 'building bye-laws', 'building bylaws',
      'भवन नक्शा', 'स्वीकृत नक्शा', 'निर्माण योजना', 'मंजूर नक्शा',
    ],
    supporting: [
      'architect', 'structural engineer', 'municipal corporation',
      'fsi', 'far', 'ground coverage', 'setback',
      'north facing', 'south facing', 'drawing',
      'वास्तुविद', 'नगर निगम अनुमति',
    ],
    negative: [],
    minScore: 4,
  },

  SANCTION_LETTER: {
    label: 'Sanction Letter',
    strong: [
      'sanction letter', 'loan sanction', 'sanctioned amount', 'disbursement',
      'sanction order', 'approved loan',
      'स्वीकृति पत्र', 'ऋण स्वीकृति', 'स्वीकृत राशि',
    ],
    supporting: [
      'interest rate', 'emi', 'tenure', 'repayment', 'processing fee',
      'ब्याज दर', 'किस्त', 'अवधि', 'पुनर्भुगतान',
    ],
    negative: [],
    minScore: 4,
  },

  ALLOTMENT_LETTER: {
    label: 'Allotment Letter',
    strong: [
      'allotment letter', 'allotment order', 'allotted to',
      'dda', 'huda', 'hrera', 'gda', 'housing board',
      'आवंटन पत्र', 'आवंटन', 'गृह विभाग',
    ],
    supporting: [
      'flat no', 'unit no', 'sector', 'pocket', 'scheme',
      'फ्लैट नं', 'इकाई', 'योजना',
    ],
    negative: [],
    minScore: 4,
  },

  POSSESSION_LETTER: {
    label: 'Possession Letter',
    strong: [
      'possession letter', 'possession certificate', 'handing over',
      'taking possession', 'physical possession',
      'कब्जा पत्र', 'कब्जा प्रमाण पत्र', 'कब्जा',
    ],
    supporting: [
      'vacant possession', 'possession date', 'handover',
      'खाली कब्जा', 'कब्जे की तारीख',
    ],
    negative: [],
    minScore: 4,
  },

  CHAIN_OF_TITLE: {
    label: 'Chain of Title',
    strong: [
      'chain of title', 'title deed', 'title search', 'title certificate',
      'encumbrance certificate', 'ec', 'encumbrance',
      'भार मुक्त प्रमाण', 'शीर्षक',
    ],
    supporting: [
      'title clear', 'free from encumbrance', 'mortgage', 'charge',
      'बंधक मुक्त', 'भार',
    ],
    negative: [],
    minScore: 4,
  },

  OCCUPANCY_CERTIFICATE: {
    label: 'Occupancy Certificate',
    strong: [
      'occupancy certificate', 'completion certificate', 'oc', 'cc',
      'fit for occupation', 'certificate of completion',
      'आवासीय प्रमाण पत्र', 'पूर्णता प्रमाण पत्र',
    ],
    supporting: [
      'municipal corporation', 'competent authority', 'building constructed',
      'नगर निगम', 'सक्षम प्राधिकरण',
    ],
    negative: [],
    minScore: 4,
  },

  OTHER: {
    label: 'Other Document',
    strong: [],
    supporting: [],
    negative: [],
    minScore: 0,
  },
};

export class DocumentClassifier {

  classify(text: string): ClassificationResult {
    const normalized = text.toLowerCase();

    const scores: Array<{ type: KnownDocType; score: number; matched: string[] }> = [];

    for (const [docType, sig] of Object.entries(SIGNATURES) as [KnownDocType, DocSignature][]) {
      if (docType === 'OTHER') continue;

      let score     = 0;
      const matched: string[] = [];

      for (const kw of sig.strong) {
        if (normalized.includes(kw.toLowerCase())) {
          score += 3;
          matched.push(kw);
        }
      }

      for (const kw of sig.supporting) {
        if (normalized.includes(kw.toLowerCase())) {
          score += 1;
          matched.push(kw);
        }
      }

      for (const kw of sig.negative) {
        if (normalized.includes(kw.toLowerCase())) {
          score -= 5;
        }
      }

      if (score >= sig.minScore) {
        scores.push({ type: docType, score, matched });
      }
    }

    if (scores.length === 0) {
      return { documentType: 'OTHER', confidence: 0.5, matchedKeywords: [] };
    }

    scores.sort((a, b) => b.score - a.score);
    const best   = scores[0];
    const second = scores[1];

    // Confidence: ratio of best to (best + second) — higher gap = more confident
    const maxPossible = (SIGNATURES[best.type].strong.length * 3) + SIGNATURES[best.type].supporting.length;
    const rawConf     = Math.min(best.score / Math.max(maxPossible, 1), 1);
    const confidence  = Math.round(rawConf * 100) / 100;

    return {
      documentType:    best.type,
      confidence:      Math.max(confidence, 0.55),
      matchedKeywords: best.matched,
      alternativeType: second?.type,
    };
  }
}
