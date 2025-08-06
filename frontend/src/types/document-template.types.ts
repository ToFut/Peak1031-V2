export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  file_template: string;
  required_fields: string[];
  is_required: boolean;
  role_access: string[];
  auto_generate: boolean;
  stage_triggers?: string[];
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerationData {
  clientName: string;
  exchangeId: string;
  propertyAddress: string;
  ownershipPercentage: string;
  propertyValue: string;
  qiName: string;
  sellerName: string;
  buyerName: string;
  deadline45: string;
  deadline180: string;
}

export const AVAILABLE_PLACEHOLDER_FIELDS = [
  '#Matter.Number#',
  '#Matter.Name#',
  '#Exchange.ID#',
  '#Exchange.Number#',
  '#Exchange.Name#',
  '#Exchange.Type#',
  '#Exchange.Status#',
  '#Exchange.Value#',
  '#Client.Name#',
  '#Client.FirstName#',
  '#Client.LastName#',
  '#Client.Email#',
  '#Client.Phone#',
  '#Client.Company#',
  '#Property.Address#',
  '#Property.RelinquishedAddress#',
  '#Property.SalePrice#',
  '#Property.ReplacementValue#',
  '#Financial.ExchangeValue#',
  '#Financial.RelinquishedValue#',
  '#Financial.ReplacementValue#',
  '#Financial.SalePrice#',
  '#Date.Start#',
  '#Date.IdentificationDeadline#',
  '#Date.CompletionDeadline#',
  '#Date.RelinquishedClosing#',
  '#Date.Current#',
  '#Date.Today#',
  '#QI.Company#',
  '#QI.Name#',
  '#Coordinator.Name#',
  '#Coordinator.Email#',
  '#System.Priority#',
  '#System.RiskLevel#',
  '#System.Notes#',
  '#System.CurrentDate#',
  '#System.CurrentDateTime#'
] as const;

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  '#Matter.Number#': 'Exchange/Matter number',
  '#Matter.Name#': 'Exchange/Matter name',
  '#Exchange.ID#': 'Unique exchange ID',
  '#Exchange.Number#': 'Exchange number',
  '#Exchange.Name#': 'Exchange name',
  '#Exchange.Type#': 'Type of exchange (Delayed, Reverse, etc.)',
  '#Exchange.Status#': 'Current exchange status',
  '#Exchange.Value#': 'Total exchange value',
  '#Client.Name#': 'Full client name',
  '#Client.FirstName#': 'Client first name',
  '#Client.LastName#': 'Client last name',
  '#Client.Email#': 'Client email address',
  '#Client.Phone#': 'Client phone number',
  '#Client.Company#': 'Client company name',
  '#Property.Address#': 'Property address',
  '#Property.RelinquishedAddress#': 'Relinquished property address',
  '#Property.SalePrice#': 'Property sale price',
  '#Property.ReplacementValue#': 'Replacement property value',
  '#Financial.ExchangeValue#': 'Total exchange value',
  '#Financial.RelinquishedValue#': 'Relinquished property value',
  '#Financial.ReplacementValue#': 'Replacement property value',
  '#Financial.SalePrice#': 'Property sale price',
  '#Date.Start#': 'Exchange start date',
  '#Date.IdentificationDeadline#': '45-day identification deadline',
  '#Date.CompletionDeadline#': '180-day completion deadline',
  '#Date.RelinquishedClosing#': 'Relinquished property closing date',
  '#Date.Current#': 'Current date',
  '#Date.Today#': 'Today\'s date',
  '#QI.Company#': 'Qualified Intermediary company',
  '#QI.Name#': 'Qualified Intermediary name',
  '#Coordinator.Name#': 'Exchange coordinator name',
  '#Coordinator.Email#': 'Exchange coordinator email',
  '#System.Priority#': 'Exchange priority level',
  '#System.RiskLevel#': 'Risk assessment level',
  '#System.Notes#': 'Client notes',
  '#System.CurrentDate#': 'Current date',
  '#System.CurrentDateTime#': 'Current date and time'
};

export function getFieldDescription(field: string): string {
  return FIELD_DESCRIPTIONS[field] || field;
}