import { Exchange } from '@/shared/types/exchange';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
};

export const validateSSN = (ssn: string): boolean => {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;
  
  // SSN cannot start with 9
  if (cleaned[0] === '9') return false;
  
  // SSN cannot be all zeros in any group
  const area = cleaned.slice(0, 3);
  const group = cleaned.slice(3, 5);
  const serial = cleaned.slice(5);
  
  return area !== '000' && group !== '00' && serial !== '0000';
};

export const validateZipCode = (zip: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
};

export const validateEIN = (ein: string): boolean => {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length !== 9) return false;
  
  // EIN prefixes that are valid
  const validPrefixes = [
    '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15', '16',
    '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34',
    '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
    '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
    '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76',
    '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
    '93', '94', '95', '98', '99'
  ];
  
  return validPrefixes.includes(cleaned.slice(0, 2));
};

export const validateExchangeData = (exchange: Partial<Exchange>): ValidationResult => {
  const errors: string[] = [];
  
  // Required fields
  if (!exchange.clientId) {
    errors.push('Client is required');
  }
  
  if (!exchange.relinquishedPropertyAddress && !exchange.relinquishedProperty) {
    errors.push('Relinquished property address is required');
  }
  
  const relinquishedValue = exchange.relinquishedValue || exchange.relinquishedSalePrice || exchange.exchangeValue;
  if (!relinquishedValue || relinquishedValue <= 0) {
    errors.push('Relinquished property value must be greater than 0');
  }
  
  // Date validations - using camelCase properties that match Exchange interface
  if (exchange.relinquishedClosingDate && exchange.identificationDeadline) {
    const closingDate = new Date(exchange.relinquishedClosingDate);
    const identificationDeadline = new Date(exchange.identificationDeadline);
    const daysDiff = Math.floor((identificationDeadline.getTime() - closingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 45) {
      errors.push('Identification deadline cannot be more than 45 days after closing');
    }
  }
  
  if (exchange.completionDeadline && exchange.relinquishedClosingDate) {
    const closingDate = new Date(exchange.relinquishedClosingDate);
    const replacementDeadline = new Date(exchange.completionDeadline);
    const daysDiff = Math.floor((replacementDeadline.getTime() - closingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 180) {
      errors.push('Replacement property closing deadline cannot be more than 180 days after relinquished property closing');
    }
  }
  
  // Value validations for 1031 exchange
  const replacementValue = exchange.replacementValue || 
    (exchange.replacementProperties && exchange.replacementProperties[0]?.value);
    
  if (replacementValue && relinquishedValue) {
    if (replacementValue < relinquishedValue) {
      errors.push('Warning: Replacement property value is less than relinquished property value. This may result in taxable boot.');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateDate = (date: string): boolean => {
  const d = new Date(date);
  return !isNaN(d.getTime());
};

export const validateCurrency = (amount: string): boolean => {
  const currencyRegex = /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/;
  return currencyRegex.test(amount);
};