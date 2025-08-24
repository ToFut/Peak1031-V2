import React, { useState } from 'react';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  Tag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  DollarSign,
  Shield,
  MessageSquare,
  UserCheck,
  Activity,
  Hash,
  Receipt,
  Users
} from 'lucide-react';

interface PPContactDataDisplayProps {
  contactData: any;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const PPContactDataDisplay: React.FC<PPContactDataDisplayProps> = ({
  contactData,
  className = '',
  variant = 'detailed'
}) => {
  const [showRawData, setShowRawData] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    contact: true,
    business: true,
    financial: true,
    settings: false,
    pp: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Extract PP data
  const ppData = contactData.ppData || contactData.pp_raw_data || {};
  const hasPPData = contactData.hasPPData || contactData.pp_id;

  // Format phone number
  const formatPhone = (phone: string) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Format date for US format
  const formatDate = (dateString: string) => {
    if (!dateString) return null;
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

  const renderContactInfo = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
          <User className="w-5 h-5" />
          Contact Information
        </h3>
        <button
          onClick={() => toggleSection('contact')}
          className="text-blue-600 hover:text-blue-800"
        >
          {expandedSections.contact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expandedSections.contact && (
        <div className="space-y-3">
          {/* Primary Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-gray-900">
                  {contactData.firstName || contactData.first_name} {contactData.lastName || contactData.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{contactData.email}</p>
              </div>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(contactData.phone_primary || contactData.phoneNumber || contactData.home_phone) && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Home</p>
                  <p className="text-gray-900">{formatPhone(contactData.home_phone || contactData.phone_primary || contactData.phoneNumber)}</p>
                </div>
              </div>
            )}

            {contactData.phone_mobile && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Mobile</p>
                  <p className="text-gray-900">{formatPhone(contactData.phone_mobile)}</p>
                </div>
              </div>
            )}

            {contactData.phone_work && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Work</p>
                  <p className="text-gray-900">{formatPhone(contactData.phone_work)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Address Information */}
          {(contactData.address || contactData.street || contactData.city || contactData.state || contactData.zip) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Address</p>
                <div className="text-gray-900">
                  {contactData.address && <p>{contactData.address}</p>}
                  {contactData.street && <p>{contactData.street}</p>}
                  {(contactData.city || contactData.state || contactData.zip) && (
                    <p>{contactData.city} {contactData.state} {contactData.zip}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status and Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contactData.status && (
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <p className="text-gray-900">{contactData.status}</p>
                </div>
              </div>
            )}

            {contactData.assigned_to && (
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Assigned To</p>
                  <p className="text-gray-900">{contactData.assigned_to}</p>
                </div>
              </div>
            )}

            {contactData.number && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Number</p>
                  <p className="text-gray-900">{contactData.number}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderFinancialInfo = () => (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Information
        </h3>
        <button
          onClick={() => toggleSection('financial')}
          className="text-emerald-600 hover:text-emerald-800"
        >
          {expandedSections.financial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expandedSections.financial && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contactData.fee && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Fee (USD)</p>
                  <p className="text-gray-900 font-semibold">{contactData.fee}</p>
                </div>
              </div>
            )}

            {contactData.additional_property_fee !== undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Additional Property Fee (USD)</p>
                  <p className="text-gray-900 font-semibold">{contactData.additional_property_fee || '$0.00'}</p>
                </div>
              </div>
            )}
          </div>

          {contactData.internal_credit_to && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Internal Credit To</p>
                <p className="text-gray-900">{contactData.internal_credit_to}</p>
              </div>
            </div>
          )}

          {contactData.referral_source && (
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Referral Source</p>
                <p className="text-gray-900">{contactData.referral_source}</p>
              </div>
            </div>
          )}

          {contactData.invoice_template && (
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Invoice Template</p>
                <p className="text-gray-900">{contactData.invoice_template}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderClientSettings = () => (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Client Portal & Settings
        </h3>
        <button
          onClick={() => toggleSection('settings')}
          className="text-orange-600 hover:text-orange-800"
        >
          {expandedSections.settings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expandedSections.settings && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Client Portal</p>
                <p className={`text-sm font-semibold ${
                  contactData.client_portal === 'Yes' || contactData.client_portal === true 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {contactData.client_portal === 'Yes' || contactData.client_portal === true ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Text Messages</p>
                <p className={`text-sm font-semibold ${
                  contactData.text_messages === 'Yes' || contactData.text_messages === true 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {contactData.text_messages === 'Yes' || contactData.text_messages === true ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>

            {contactData.client_portal_settings && (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Portal Settings</p>
                  <p className="text-gray-900 text-sm">{contactData.client_portal_settings}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderBusinessInfo = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Business Information
        </h3>
        <button
          onClick={() => toggleSection('business')}
          className="text-green-600 hover:text-green-800"
        >
          {expandedSections.business ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expandedSections.business && (
        <div className="space-y-3">
          {contactData.company && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Company</p>
                <p className="text-gray-900">{contactData.company}</p>
              </div>
            </div>
          )}

          {contactData.title && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Title</p>
                <p className="text-gray-900">{contactData.title}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderPPData = () => {
    if (!hasPPData) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Database className="w-5 h-5" />
            <p className="text-sm">No PracticePanther data available for this contact</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
            <Database className="w-5 h-5" />
            PracticePanther Data
            <ExternalLink className="w-4 h-4" />
          </h3>
          <button
            onClick={() => toggleSection('pp')}
            className="text-purple-600 hover:text-purple-800"
          >
            {expandedSections.pp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expandedSections.pp && (
          <div className="space-y-4">
            {/* PP Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contactData.pp_id && (
                <div>
                  <p className="text-sm font-medium text-gray-700">PP Contact ID</p>
                  <p className="text-gray-900 font-mono text-sm">{contactData.pp_id}</p>
                </div>
              )}

              {contactData.pp_display_name && (
                <div>
                  <p className="text-sm font-medium text-gray-700">PP Display Name</p>
                  <p className="text-gray-900">{contactData.pp_display_name}</p>
                </div>
              )}

              {contactData.pp_is_primary_contact !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Primary Contact</p>
                  <p className="text-gray-900">{contactData.pp_is_primary_contact ? 'Yes' : 'No'}</p>
                </div>
              )}

              {contactData.pp_account_ref_display_name && (
                <div>
                  <p className="text-sm font-medium text-gray-700">PP Account</p>
                  <p className="text-gray-900">{contactData.pp_account_ref_display_name}</p>
                </div>
              )}
            </div>

            {/* PP Contact Details */}
            {(contactData.pp_email || contactData.pp_phone_mobile || contactData.pp_phone_work) && (
              <div>
                <h4 className="text-sm font-semibold text-purple-800 mb-2">PP Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {contactData.pp_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">PP Email</p>
                        <p className="text-sm text-gray-900">{contactData.pp_email}</p>
                      </div>
                    </div>
                  )}

                  {contactData.pp_phone_mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">PP Mobile</p>
                        <p className="text-sm text-gray-900">{formatPhone(contactData.pp_phone_mobile)}</p>
                      </div>
                    </div>
                  )}

                  {contactData.pp_phone_work && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">PP Work</p>
                        <p className="text-sm text-gray-900">{formatPhone(contactData.pp_phone_work)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PP Notes */}
            {contactData.pp_notes && (
              <div>
                <h4 className="text-sm font-semibold text-purple-800 mb-2">PP Notes</h4>
                <div className="bg-white rounded p-3 border">
                  <p className="text-sm text-gray-900">{contactData.pp_notes}</p>
                </div>
              </div>
            )}

            {/* PP Custom Fields */}
            {contactData.pp_custom_field_values && contactData.pp_custom_field_values.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-800 mb-2">PP Custom Fields</h4>
                <div className="bg-white rounded p-3 border">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(contactData.pp_custom_field_values, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Sync Information */}
            <div className="border-t border-purple-200 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {contactData.pp_synced_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-500" />
                    <div>
                      <p className="text-gray-600">Last Synced</p>
                      <p className="text-gray-900">{formatDate(contactData.pp_synced_at)}</p>
                    </div>
                  </div>
                )}

                {contactData.pp_created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-500" />
                    <div>
                      <p className="text-gray-600">PP Created</p>
                      <p className="text-gray-900">{formatDate(contactData.pp_created_at)}</p>
                    </div>
                  </div>
                )}

                {contactData.pp_updated_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-500" />
                    <div>
                      <p className="text-gray-600">PP Updated</p>
                      <p className="text-gray-900">{formatDate(contactData.pp_updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Raw PP Data Toggle */}
            <div className="border-t border-purple-200 pt-3">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800"
              >
                <FileText className="w-4 h-4" />
                {showRawData ? 'Hide' : 'Show'} Raw PP Data
                {showRawData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawData && ppData && (
                <div className="mt-3 bg-gray-900 text-green-400 rounded p-3 text-xs font-mono max-h-64 overflow-auto">
                  <pre>{JSON.stringify(ppData, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Contact Details</h3>
          {hasPPData && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
              <Database className="w-3 h-3" />
              PP Synced
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">Email</p>
            <p className="text-gray-900 truncate">{contactData.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="text-gray-900">{formatPhone(contactData.phone_primary || contactData.phoneNumber) || 'N/A'}</p>
          </div>
          {contactData.company && (
            <>
              <div>
                <p className="text-gray-600">Company</p>
                <p className="text-gray-900 truncate">{contactData.company}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {renderContactInfo()}
      {renderBusinessInfo()}
      {renderFinancialInfo()}
      {renderClientSettings()}
      {renderPPData()}
    </div>
  );
};

export default PPContactDataDisplay;