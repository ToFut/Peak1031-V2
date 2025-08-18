/**
 * Helper function to extract custom field values from exchange data
 * PracticePanther stores property information in custom_field_values array
 */

export interface CustomFieldValue {
  custom_field_ref?: {
    id: string;
    label: string;
    value_type: string;
  };
  customField?: {
    id: string;
    label: string;
    name?: string;
  };
  value_string?: string;
  value_number?: number;
  value_date_time?: string;
  value_boolean?: boolean;
  textValue?: string;
  value?: any;
}

export interface ExtractedPropertyData {
  relPropertyAddress?: string;
  relPropertyCity?: string;
  relPropertyState?: string;
  relPropertyZip?: string;
  rep1PropertyAddress?: string;
  closeOfEscrowDate?: string;
  saleDate?: string;
  day45?: string;
  day180?: string;
  relValue?: number;
  rep1Value?: number;
  bank?: string;
  relEscrowNumber?: string;
  relContractDate?: string;
  relApn?: string;
  buyer1Name?: string;
  buyer2Name?: string;
  clientVesting?: string;
  typeOfExchange?: string;
  [key: string]: any;
}

/**
 * Extract property data from custom field values
 */
export function extractCustomFieldData(exchange: any): ExtractedPropertyData {
  const extracted: ExtractedPropertyData = {};
  
  // Check both camelCase and snake_case versions
  const customFields = exchange.customFieldValues || exchange.custom_field_values;
  
  if (!customFields || !Array.isArray(customFields)) {
    return extracted;
  }
  
  // Map of custom field labels to our property names
  const fieldMapping: { [key: string]: string } = {
    'Rel Property Address': 'relPropertyAddress',
    'Rel Property City': 'relPropertyCity',
    'Rel Property State': 'relPropertyState',
    'Rel Property Zip': 'relPropertyZip',
    'Rep 1 Property Address': 'rep1PropertyAddress',
    'Close of Escrow Date': 'closeOfEscrowDate',
    'Sale Date': 'saleDate',
    'Day 45': 'day45',
    'Day 180': 'day180',
    'Rel Value': 'relValue',
    'Rep 1 Value': 'rep1Value',
    'Bank': 'bank',
    'Rel Escrow Number': 'relEscrowNumber',
    'Rel Contract Date': 'relContractDate',
    'Rel APN': 'relApn',
    'Buyer 1 Name': 'buyer1Name',
    'Buyer 2 Name': 'buyer2Name',
    'Client Vesting': 'clientVesting',
    'Type of Exchange': 'typeOfExchange',
    'Rel Purchase Contract Title': 'relPurchaseContractTitle',
    'Rep 1 Purchase Contract Title': 'rep1PurchaseContractTitle',
    'Rep 1 City': 'rep1City',
    'Rep 1 State': 'rep1State',
    'Rep 1 Zip': 'rep1Zip',
    'Rep 1 Escrow Number': 'rep1EscrowNumber',
    'Rep 1 Purchase Contract Date': 'rep1PurchaseContractDate',
    'Rep 1 Seller 1 Name': 'rep1Seller1Name',
    'Rep 1 Seller 2 Name': 'rep1Seller2Name',
    'Rep 1 APN': 'rep1Apn'
  };
  
  // Extract values from custom fields
  customFields.forEach((field: CustomFieldValue) => {
    // Get the label from either structure
    const label = field.custom_field_ref?.label || 
                  field.customField?.label || 
                  field.customField?.name;
    
    if (!label) return;
    
    // Get the value from various possible fields
    const value = field.value_string || 
                  field.textValue || 
                  field.value_number || 
                  field.value_date_time || 
                  field.value ||
                  (field.value_boolean !== undefined ? field.value_boolean : null);
    
    // Map to our property name
    const propertyName = fieldMapping[label];
    if (propertyName && value !== null && value !== undefined && value !== '') {
      extracted[propertyName] = value;
    }
    
    // Also store with original label (normalized)
    const normalizedLabel = label.replace(/\s+/g, '').toLowerCase();
    if (value !== null && value !== undefined && value !== '') {
      extracted[normalizedLabel] = value;
    }
  });
  
  return extracted;
}

/**
 * Get property address from exchange data
 */
export function getPropertyAddress(exchange: any): string {
  // First check direct fields
  if (exchange.relPropertyAddress) return exchange.relPropertyAddress;
  if (exchange.rel_property_address) return exchange.rel_property_address;
  if (exchange.propertyAddress) return exchange.propertyAddress;
  if (exchange.property_address) return exchange.property_address;
  
  // Then check custom fields
  const customData = extractCustomFieldData(exchange);
  if (customData.relPropertyAddress) return customData.relPropertyAddress;
  
  return 'Not specified';
}

/**
 * Get property value from exchange data
 */
export function getPropertyValue(exchange: any): number | null {
  // First check direct fields
  if (exchange.relinquishedPropertyValue) return exchange.relinquishedPropertyValue;
  if (exchange.relinquished_property_value) return exchange.relinquished_property_value;
  if (exchange.exchangeValue) return exchange.exchangeValue;
  if (exchange.exchange_value) return exchange.exchange_value;
  
  // Then check custom fields
  const customData = extractCustomFieldData(exchange);
  if (customData.relValue) return customData.relValue;
  
  return null;
}

/**
 * Get closing date from exchange data
 */
export function getClosingDate(exchange: any): string | null {
  // First check direct fields
  if (exchange.closeOfEscrowDate) return exchange.closeOfEscrowDate;
  if (exchange.close_of_escrow_date) return exchange.close_of_escrow_date;
  if (exchange.saleDate) return exchange.saleDate;
  if (exchange.sale_date) return exchange.sale_date;
  if (exchange.closingDate) return exchange.closingDate;
  if (exchange.closing_date) return exchange.closing_date;
  
  // Then check custom fields
  const customData = extractCustomFieldData(exchange);
  if (customData.closeOfEscrowDate) return customData.closeOfEscrowDate;
  if (customData.saleDate) return customData.saleDate;
  
  // Check close_date field
  if (exchange.close_date) return exchange.close_date;
  if (exchange.closeDate) return exchange.closeDate;
  
  return null;
}

/**
 * Get full property information including city, state, zip
 */
export function getFullPropertyAddress(exchange: any): string {
  const customData = extractCustomFieldData(exchange);
  
  const parts = [];
  
  // Get address
  const address = getPropertyAddress(exchange);
  if (address && address !== 'Not specified') {
    parts.push(address);
  }
  
  // Add city
  if (customData.relPropertyCity) {
    parts.push(customData.relPropertyCity);
  }
  
  // Add state and zip
  const stateZip = [];
  if (customData.relPropertyState) {
    stateZip.push(customData.relPropertyState);
  }
  if (customData.relPropertyZip) {
    stateZip.push(customData.relPropertyZip);
  }
  
  if (stateZip.length > 0) {
    parts.push(stateZip.join(' '));
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}