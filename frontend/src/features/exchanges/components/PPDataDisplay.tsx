import React from 'react';
import { Exchange } from '../../../types';
import { Building2, Calendar, DollarSign, MapPin, User, FileText, Scale } from 'lucide-react';

interface PPDataDisplayProps {
  exchange: Exchange;
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface PPDataField {
  label: string;
  value: any;
  icon?: React.ReactNode;
  format?: 'currency' | 'date' | 'text';
}

export const PPDataDisplay: React.FC<PPDataDisplayProps> = ({
  exchange,
  variant = 'compact',
  className = ''
}) => {
  // Extract PP data from exchange - using actual database field names
  const ppData = exchange || {};
  
  // Main exchange information from PP
  const generalInfo: PPDataField[] = [
    {
      label: 'Matter Name',
      value: exchange.ppData?.pp_display_name || exchange.name,
      icon: <FileText className="w-4 h-4" />
    },
    {
      label: 'Type of Exchange',
      value: exchange.ppData?.type_of_exchange || exchange.exchangeType,
      icon: <Scale className="w-4 h-4" />
    },
    {
      label: 'Client Vesting',
      value: exchange.ppData?.client_vesting,
      icon: <User className="w-4 h-4" />
    },
    {
      label: 'Bank',
      value: exchange.ppData?.bank,
      icon: <Building2 className="w-4 h-4" />
    },
    {
      label: 'Rate',
      value: exchange.ppData?.rate,
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      label: 'Responsible Attorney',
      value: exchange.ppData?.pp_responsible_attorney,
      icon: <User className="w-4 h-4" />
    }
  ];

  // Relinquished property information
  const relinquishedInfo: PPDataField[] = [
    {
      label: 'Property Address',
      value: exchange.ppData?.rel_property_address || exchange.relinquishedPropertyAddress,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      label: 'City, State Zip',
      value: exchange.ppData?.rel_property_city && exchange.ppData?.rel_property_state 
        ? `${exchange.ppData.rel_property_city}, ${exchange.ppData.rel_property_state} ${exchange.ppData.rel_property_zip || ''}`.trim()
        : null,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      label: 'APN',
      value: exchange.ppData?.rel_apn,
      icon: <Building2 className="w-4 h-4" />
    },
    {
      label: 'Escrow Number',
      value: exchange.ppData?.rel_escrow_number,
      icon: <FileText className="w-4 h-4" />
    },
    {
      label: 'Value',
      value: exchange.ppData?.rel_value || exchange.relinquishedValue,
      icon: <DollarSign className="w-4 h-4" />,
      format: 'currency' as const
    },
    {
      label: 'Contract Date',
      value: exchange.ppData?.rel_contract_date,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: 'Close of Escrow',
      value: exchange.ppData?.close_of_escrow_date || exchange.relinquishedClosingDate,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    }
  ];

  // Replacement property information
  const replacementInfo: PPDataField[] = [
    {
      label: 'Rep 1 Address',
      value: exchange.ppData?.rep_1_property_address,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      label: 'Rep 1 City, State Zip',
      value: exchange.ppData?.rep_1_city && exchange.ppData?.rep_1_state 
        ? `${exchange.ppData.rep_1_city}, ${exchange.ppData.rep_1_state} ${exchange.ppData.rep_1_zip || ''}`.trim()
        : null,
      icon: <MapPin className="w-4 h-4" />
    },
    {
      label: 'Rep 1 APN',
      value: exchange.ppData?.rep_1_apn,
      icon: <Building2 className="w-4 h-4" />
    },
    {
      label: 'Rep 1 Escrow Number',
      value: exchange.ppData?.rep_1_escrow_number,
      icon: <FileText className="w-4 h-4" />
    },
    {
      label: 'Rep 1 Value',
      value: exchange.ppData?.rep_1_value,
      icon: <DollarSign className="w-4 h-4" />,
      format: 'currency' as const
    },
    {
      label: 'Rep 1 Contract Date',
      value: exchange.ppData?.rep_1_contract_date,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: 'Rep 1 Seller',
      value: exchange.ppData?.rep_1_seller_name,
      icon: <User className="w-4 h-4" />
    },
    {
      label: 'Buyer 1 Name',
      value: exchange.ppData?.buyer_1_name,
      icon: <User className="w-4 h-4" />
    },
    {
      label: 'Buyer 2 Name',
      value: exchange.ppData?.buyer_2_name,
      icon: <User className="w-4 h-4" />
    }
  ];

  // Key dates
  const keyDates: PPDataField[] = [
    {
      label: '45-Day Deadline',
      value: exchange.ppData?.day_45 || exchange.identificationDeadline,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: '180-Day Deadline',
      value: exchange.ppData?.day_180 || exchange.completionDeadline,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: 'Proceeds',
      value: exchange.ppData?.proceeds,
      icon: <DollarSign className="w-4 h-4" />,
      format: 'currency' as const
    },
    {
      label: 'PP Opened Date',
      value: exchange.ppData?.pp_opened_date,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: 'PP Closed Date',
      value: exchange.ppData?.pp_closed_date,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    },
    {
      label: 'Last Synced',
      value: exchange.ppData?.pp_synced_at || exchange.lastSyncAt,
      icon: <Calendar className="w-4 h-4" />,
      format: 'date' as const
    }
  ];

  const formatValue = (field: PPDataField): string => {
    if (!field.value) return 'Not specified';
    
    switch (field.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Number(field.value));
      case 'date':
        try {
          return new Date(field.value).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          });
        } catch {
          return field.value;
        }
      default:
        return String(field.value);
    }
  };

  const renderField = (field: PPDataField, index: number) => {
    if (!field.value) return null;

    return (
      <div key={index} className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-gray-400">
          {field.icon}
        </div>
        <div className="min-w-0 flex-1">
          <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
          <dd className="text-sm text-gray-900 mt-1 break-words">{formatValue(field)}</dd>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, fields: PPDataField[], bgColor = 'bg-gray-50') => {
    const validFields = fields.filter(field => field.value);
    if (validFields.length === 0) return null;

    return (
      <div className={`${bgColor} rounded-lg p-4`}>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {title}
        </h4>
        <dl className="space-y-3">
          {validFields.map((field, index) => renderField(field, index))}
        </dl>
      </div>
    );
  };

  if (variant === 'compact') {
    // Show only key information for list view
    const keyFields = [
      ...generalInfo.slice(0, 2),
      ...keyDates.filter(field => field.value)
    ];

    return (
      <div className={`space-y-2 ${className}`}>
        {keyFields.map((field, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{field.icon}</span>
            <span className="text-gray-600">{field.label}:</span>
            <span className="font-medium text-gray-900">{formatValue(field)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* General Information */}
      {renderSection('General Information', generalInfo, 'bg-blue-50')}
      
      {/* Relinquished Property */}
      {renderSection('Relinquished Property Information', relinquishedInfo, 'bg-green-50')}
      
      {/* Replacement Property */}
      {renderSection('Replacement Property Information', replacementInfo, 'bg-purple-50')}
      
      {/* Key Dates & Financials */}
      {renderSection('Key Dates & Financials', keyDates, 'bg-yellow-50')}
    </div>
  );
};

export default PPDataDisplay;