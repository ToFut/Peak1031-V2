import React from 'react';

interface ContactCardProps {
  contact?: any;
  className?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, className }) => {
  return (
    <div className={`p-4 bg-white rounded-lg border ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
          {contact?.name?.[0] || 'C'}
        </div>
        <div>
          <h3 className="font-medium">{contact?.name || 'Contact Name'}</h3>
          <p className="text-sm text-gray-500">{contact?.email || 'email@example.com'}</p>
        </div>
      </div>
    </div>
  );
};
EOF < /dev/null