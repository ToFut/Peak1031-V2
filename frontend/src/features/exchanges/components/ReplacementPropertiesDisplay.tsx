import React, { useState } from 'react';
import { Exchange, ReplacementProperty } from '../../../types';
import { Building2, MapPin, DollarSign, Calendar, Plus, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';

interface ReplacementPropertiesDisplayProps {
  exchange: Exchange;
  onUpdate?: (properties: ReplacementProperty[]) => void;
  readOnly?: boolean;
  variant?: 'compact' | 'detailed';
}

interface ExtendedReplacementProperty extends ReplacementProperty {
  id?: string;
  apn?: string;
  escrowNumber?: string;
  seller?: string;
  contractTitle?: string;
  notes?: string;
  status?: 'identified' | 'under_contract' | 'closed' | 'cancelled';
}

export const ReplacementPropertiesDisplay: React.FC<ReplacementPropertiesDisplayProps> = ({
  exchange,
  onUpdate,
  readOnly = true,
  variant = 'detailed'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingProperty, setEditingProperty] = useState<number | null>(null);

  // Extract replacement properties from exchange data
  const getReplacementProperties = (): ExtendedReplacementProperty[] => {
    const properties: ExtendedReplacementProperty[] = [];
    
    // Add properties from exchange.replacementProperties array
    if (exchange.replacementProperties && Array.isArray(exchange.replacementProperties)) {
      properties.push(...exchange.replacementProperties);
    }
    
    // Add first replacement property from PP data if available
    if (exchange.ppData?.rep_1_property_address) {
      const rep1: ExtendedReplacementProperty = {
        address: exchange.ppData?.rep_1_property_address || '',
        purchasePrice: exchange.ppData?.rep_1_value || 0,
        closingDate: exchange.ppData?.rep_1_contract_date || '',
        apn: exchange.ppData?.rep_1_apn,
        escrowNumber: exchange.ppData?.rep_1_escrow_number,
        seller: exchange.ppData?.rep_1_seller_name,
        status: 'identified'
      };
      
      // Only add if not already in the array
      if (!properties.some(p => p.address === rep1.address)) {
        properties.push(rep1);
      }
    }
    
    // Add more properties from PP data if they exist (rep_2, rep_3, etc.)
    for (let i = 2; i <= 10; i++) {
      const address = exchange.ppData?.[`rep_${i}_property_address`];
      if (address) {
        const repProperty: ExtendedReplacementProperty = {
          address,
          purchasePrice: exchange.ppData?.[`rep_${i}_value`] || 0,
          closingDate: exchange.ppData?.[`rep_${i}_contract_date`] || '',
          apn: exchange.ppData?.[`rep_${i}_apn`],
          escrowNumber: exchange.ppData?.[`rep_${i}_escrow_number`],
          seller: exchange.ppData?.[`rep_${i}_seller_name`],
          status: 'identified'
        };
        properties.push(repProperty);
      }
    }
    
    return properties.length > 0 ? properties : [];
  };

  const properties = getReplacementProperties();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      identified: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Identified' },
      under_contract: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Contract' },
      closed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Closed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.identified;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const addNewProperty = () => {
    const newProperty: ExtendedReplacementProperty = {
      address: '',
      purchasePrice: 0,
      closingDate: '',
      status: 'identified'
    };
    onUpdate?.([...properties, newProperty]);
  };

  const updateProperty = (index: number, updatedProperty: ExtendedReplacementProperty) => {
    const updatedProperties = [...properties];
    updatedProperties[index] = updatedProperty;
    onUpdate?.(updatedProperties);
    setEditingProperty(null);
  };

  const removeProperty = (index: number) => {
    const updatedProperties = properties.filter((_, i) => i !== index);
    onUpdate?.(updatedProperties);
  };

  const renderPropertyCard = (property: ExtendedReplacementProperty, index: number) => {
    const isEditing = editingProperty === index;

    return (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-900">
              Replacement Property {index + 1}
            </h4>
            {property.status && getStatusBadge(property.status)}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingProperty(isEditing ? null : index)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Edit property"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeProperty(index)}
                className="p-1 text-red-400 hover:text-red-600 rounded"
                title="Remove property"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={property.address}
              onChange={(e) => updateProperty(index, { ...property, address: e.target.value })}
              placeholder="Property address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              value={property.purchasePrice}
              onChange={(e) => updateProperty(index, { ...property, purchasePrice: Number(e.target.value) })}
              placeholder="Purchase price"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={property.closingDate}
              onChange={(e) => updateProperty(index, { ...property, closingDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">{property.address || 'Address not specified'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-semibold">
                {property.purchasePrice ? formatCurrency(property.purchasePrice) : 'Price not set'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900">{formatDate(property.closingDate)}</span>
            </div>

            {/* Additional PP data fields */}
            {property.apn && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">APN: {property.apn}</span>
              </div>
            )}
            
            {property.escrowNumber && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Escrow: {property.escrowNumber}</span>
              </div>
            )}
            
            {property.seller && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Seller: {property.seller}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (properties.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No replacement properties identified yet</p>
        {!readOnly && (
          <button
            onClick={addNewProperty}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600"
        >
          <Building2 className="w-4 h-4" />
          {properties.length} Replacement Propert{properties.length === 1 ? 'y' : 'ies'}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isExpanded && (
          <div className="pl-6 space-y-2">
            {properties.slice(0, 3).map((property, index) => (
              <div key={index} className="text-sm text-gray-600">
                <div className="font-medium">{property.address}</div>
                <div>{formatCurrency(property.purchasePrice)} • {formatDate(property.closingDate)}</div>
              </div>
            ))}
            {properties.length > 3 && (
              <div className="text-xs text-gray-500">
                +{properties.length - 3} more properties
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Replacement Properties ({properties.length})
        </h3>
        {!readOnly && (
          <button
            onClick={addNewProperty}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map((property, index) => renderPropertyCard(property, index))}
      </div>

      {properties.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              Total Replacement Value: {formatCurrency(properties.reduce((sum, prop) => sum + (prop.purchasePrice || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplacementPropertiesDisplay;