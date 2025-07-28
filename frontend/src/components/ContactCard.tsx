import React from 'react';
import { Contact } from '../types';

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
  selected?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick, selected }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {contact.firstName} {contact.lastName}
          </h3>
          
          {contact.company && (
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <span className="mr-1">🏢</span>
              <span>{contact.company}</span>
            </div>
          )}
          
          {contact.email && (
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <span className="mr-1">📧</span>
              <a 
                href={`mailto:${contact.email}`}
                className="hover:text-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </div>
          )}
          
          {contact.phone && (
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <span className="mr-1">📞</span>
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
        
        <div className="ml-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
      </div>
      
      {contact.address && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{contact.address}</p>
        </div>
      )}
    </div>
  );
}; 