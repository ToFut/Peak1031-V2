import React from 'react';
import { ContactExtended } from '../types';
import { User, Building2, Mail, Phone, MapPin, Star } from 'lucide-react';

interface ContactCardProps {
  contact: ContactExtended;
  onClick?: () => void;
  selected?: boolean;
  showPPInfo?: boolean;
  compact?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({ 
  contact, 
  onClick, 
  selected, 
  showPPInfo = true,
  compact = false 
}) => {
  const displayName = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-lg cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'hover:border-gray-300'
      } ${compact ? 'p-3' : 'p-4'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header with name and PP indicator */}
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold text-gray-900 truncate ${
              compact ? 'text-sm' : 'text-lg'
            }`}>
              <User className="w-4 h-4 inline mr-2 text-blue-600" />
              {displayName}
            </h3>
            
            {showPPInfo && contact.ppContactId && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                {!compact && (
                  <span className="text-xs text-green-600 font-medium">PP</span>
                )}
              </div>
            )}
          </div>
          
          {/* Company */}
          {contact.company && (
            <div className="flex items-center mb-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 mr-2 text-gray-400" />
              <span className="truncate">{contact.company}</span>
            </div>
          )}
          
          {/* Contact info */}
          <div className="space-y-1">
            {contact.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <a 
                  href={`mailto:${contact.email}`}
                  className="hover:text-blue-600 transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                  title={contact.email}
                >
                  {contact.email}
                </a>
              </div>
            )}
            
            {contact.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <a 
                  href={`tel:${contact.phone}`}
                  className="hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {contact.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Address */}
      {!compact && (contact.address || contact.addressStreet) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start text-xs text-gray-500">
            <MapPin className="w-3 h-3 mr-1 mt-0.5 text-gray-400 flex-shrink-0" />
            <p className="leading-relaxed">
              {contact.address ? 
                `${contact.address.street}, ${contact.address.city}, ${contact.address.state} ${contact.address.zip}` :
                `${contact.addressStreet}, ${contact.addressCity}, ${contact.addressState} ${contact.addressZip || contact.addressZipCode}`
              }
            </p>
          </div>
        </div>
      )}
      
      {/* PP Sync info */}
      {!compact && showPPInfo && contact.lastSyncAt && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Last synced: {new Date(contact.lastSyncAt).toLocaleDateString()}</span>
            <Star className="w-3 h-3 text-yellow-500" />
          </div>
        </div>
      )}
    </div>
  );
}; 