import { KnownDocType } from '../../classification/document-classifier';
import { DocumentTemplate } from './types';
import { SaleDeedTemplate }          from './sale-deed.template';
import { TaxReceiptTemplate }         from './tax-receipt.template';
import { MutationTemplate }           from './mutation.template';
import { PreviousValuationTemplate }  from './previous-valuation.template';
import { AgreementToSellTemplate }    from './agreement-to-sell.template';
import { BuildingPlanTemplate }       from './building-plan.template';

export const TEMPLATE_REGISTRY: Partial<Record<KnownDocType, DocumentTemplate>> = {
  SALE_DEED:          SaleDeedTemplate,
  REGISTRY:           SaleDeedTemplate,           // Registry shares most fields with Sale Deed
  AGREEMENT_TO_SELL:  AgreementToSellTemplate,
  PREVIOUS_VALUATION: PreviousValuationTemplate,
  TAX_RECEIPT:        TaxReceiptTemplate,
  MUTATION:           MutationTemplate,
  BUILDING_PLAN:      BuildingPlanTemplate,
  SANCTION_LETTER:    BuildingPlanTemplate,        // Sanction letter has overlapping fields
};

export function getTemplate(docType: KnownDocType): DocumentTemplate | null {
  return TEMPLATE_REGISTRY[docType] ?? null;
}

export * from './types';
