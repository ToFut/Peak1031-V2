/**
 * Agency Utilities
 * Helper functions and utilities for agency management
 */

import { Agency, AgencyStats } from '../services/agencyApi';

/**
 * Format agency display name
 */
export function formatAgencyName(agency: Partial<Agency>): string {
  if (agency.display_name) {
    return agency.display_name;
  }
  if (agency.first_name && agency.last_name) {
    return `${agency.first_name} ${agency.last_name}`;
  }
  if (agency.company) {
    return agency.company;
  }
  return 'Unknown Agency';
}

/**
 * Get agency status badge color
 */
export function getAgencyStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get performance score color
 */
export function getPerformanceScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  if (score >= 40) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Calculate agency health score
 */
export function calculateAgencyHealth(stats: AgencyStats): {
  score: number;
  label: string;
  color: string;
} {
  if (!stats) {
    return { score: 0, label: 'Unknown', color: 'gray' };
  }

  let score = 0;
  
  // Third parties (max 25 points)
  if (stats.third_parties > 0) score += Math.min(stats.third_parties * 5, 25);
  
  // Active exchanges (max 25 points)
  if (stats.exchanges.active > 0) score += Math.min(stats.exchanges.active * 5, 25);
  
  // Success rate (max 25 points)
  score += (stats.performance.success_rate / 100) * 25;
  
  // Performance score (max 25 points)
  score += (stats.performance.average_score / 100) * 25;

  let label = 'Poor';
  let color = 'red';
  
  if (score >= 80) {
    label = 'Excellent';
    color = 'green';
  } else if (score >= 60) {
    label = 'Good';
    color = 'blue';
  } else if (score >= 40) {
    label = 'Fair';
    color = 'yellow';
  }

  return { score: Math.round(score), label, color };
}

/**
 * Validate agency email
 */
export function validateAgencyEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate agency phone
 */
export function validateAgencyPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Generate agency initials
 */
export function getAgencyInitials(agency: Partial<Agency>): string {
  if (agency.display_name) {
    return agency.display_name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (agency.first_name && agency.last_name) {
    return `${agency.first_name[0]}${agency.last_name[0]}`.toUpperCase();
  }
  if (agency.company) {
    return agency.company
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return 'AG';
}

/**
 * Sort agencies by different criteria
 */
export function sortAgencies(agencies: Agency[], sortBy: string, order: 'asc' | 'desc' = 'asc'): Agency[] {
  const sorted = [...agencies].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = formatAgencyName(a).toLowerCase();
        bValue = formatAgencyName(b).toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'third_parties':
        aValue = a.stats?.third_parties || 0;
        bValue = b.stats?.third_parties || 0;
        break;
      case 'performance':
        aValue = a.stats?.performance.average_score || 0;
        bValue = b.stats?.performance.average_score || 0;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Filter agencies by search query
 */
export function filterAgencies(agencies: Agency[], query: string): Agency[] {
  if (!query) return agencies;
  
  const searchTerm = query.toLowerCase();
  
  return agencies.filter(agency => {
    const name = formatAgencyName(agency).toLowerCase();
    const email = (agency.email || '').toLowerCase();
    const company = (agency.company || '').toLowerCase();
    const phone = (agency.phone_primary || '').toLowerCase();
    
    return (
      name.includes(searchTerm) ||
      email.includes(searchTerm) ||
      company.includes(searchTerm) ||
      phone.includes(searchTerm)
    );
  });
}

/**
 * Group agencies by status
 */
export function groupAgenciesByStatus(agencies: Agency[]): Record<string, Agency[]> {
  return agencies.reduce((groups, agency) => {
    const status = agency.status || 'unknown';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(agency);
    return groups;
  }, {} as Record<string, Agency[]>);
}

/**
 * Calculate agency statistics summary
 */
export function calculateAgencySummary(agencies: Agency[]): {
  total: number;
  active: number;
  inactive: number;
  totalThirdParties: number;
  totalExchanges: number;
  totalValue: number;
  averagePerformance: number;
} {
  const summary = agencies.reduce((acc, agency) => {
    acc.total++;
    if (agency.status === 'active') acc.active++;
    if (agency.status === 'inactive') acc.inactive++;
    
    if (agency.stats) {
      acc.totalThirdParties += agency.stats.third_parties;
      acc.totalExchanges += agency.stats.exchanges.total;
      acc.totalValue += agency.stats.exchanges.totalValue;
      acc.performanceSum += agency.stats.performance.average_score;
    }
    
    return acc;
  }, {
    total: 0,
    active: 0,
    inactive: 0,
    totalThirdParties: 0,
    totalExchanges: 0,
    totalValue: 0,
    performanceSum: 0
  });

  return {
    ...summary,
    averagePerformance: summary.total > 0 ? summary.performanceSum / summary.total : 0
  };
}

/**
 * Export agencies to CSV format
 */
export function agenciesToCSV(agencies: Agency[]): string {
  const headers = [
    'Name',
    'Email',
    'Company',
    'Phone',
    'Status',
    'Third Parties',
    'Active Exchanges',
    'Total Revenue',
    'Performance Score',
    'Created Date'
  ];

  const rows = agencies.map(agency => [
    formatAgencyName(agency),
    agency.email || '',
    agency.company || '',
    agency.phone_primary || '',
    agency.status || '',
    agency.stats?.third_parties || 0,
    agency.stats?.exchanges.active || 0,
    agency.stats?.exchanges.totalValue || 0,
    agency.stats?.performance.average_score || 0,
    new Date(agency.created_at).toLocaleDateString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Validate agency form data
 */
export interface AgencyFormData {
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  createUser?: boolean;
  userEmail?: string;
  userPassword?: string;
}

export interface AgencyFormErrors {
  [key: string]: string;
}

export function validateAgencyForm(data: AgencyFormData): AgencyFormErrors {
  const errors: AgencyFormErrors = {};

  // Required fields
  if (!data.first_name?.trim()) {
    errors.first_name = 'First name is required';
  }
  
  if (!data.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  }
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!validateAgencyEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Optional fields validation
  if (data.phone && !validateAgencyPhone(data.phone)) {
    errors.phone = 'Invalid phone format';
  }

  if (data.zip && !/^\d{5}(-\d{4})?$/.test(data.zip)) {
    errors.zip = 'Invalid ZIP code format';
  }

  // User creation validation
  if (data.createUser) {
    if (!data.userEmail?.trim()) {
      errors.userEmail = 'User email is required';
    } else if (!validateAgencyEmail(data.userEmail)) {
      errors.userEmail = 'Invalid email format';
    }

    if (!data.userPassword?.trim()) {
      errors.userPassword = 'Password is required';
    } else if (data.userPassword.length < 8) {
      errors.userPassword = 'Password must be at least 8 characters';
    }
  }

  return errors;
}

/**
 * Get agency avatar URL or placeholder
 */
export function getAgencyAvatar(agency: Partial<Agency>): string {
  // If agency has custom avatar URL in metadata
  if (agency.metadata?.avatarUrl) {
    return agency.metadata.avatarUrl;
  }
  
  // Generate placeholder with initials
  const initials = getAgencyInitials(agency);
  const colors = ['4F46E5', '7C3AED', 'DC2626', 'EA580C', '16A34A', '0891B2'];
  const colorIndex = Math.abs(initials.charCodeAt(0) + initials.charCodeAt(1)) % colors.length;
  const color = colors[colorIndex];
  
  return `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=128`;
}

// Export all utilities
export default {
  formatAgencyName,
  getAgencyStatusColor,
  getPerformanceScoreColor,
  formatCurrency,
  calculateAgencyHealth,
  validateAgencyEmail,
  validateAgencyPhone,
  getAgencyInitials,
  sortAgencies,
  filterAgencies,
  groupAgenciesByStatus,
  calculateAgencySummary,
  agenciesToCSV,
  validateAgencyForm,
  getAgencyAvatar
};