import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Lock, 
  Unlock, 
  Shield, 
  User, 
  Building,
  CheckCircle,
  XCircle,
  Settings,
  Filter
} from 'lucide-react';
import { useExchangePermissions } from '../../../hooks/useExchangePermissions';

interface DocumentTypePermission {
  documentType: string;
  label: string;
  description: string;
  permissions: {
    view: boolean;
    download: boolean;
    upload: boolean;
  };
  roleRestrictions?: string[];
  requiresPIN?: boolean;
}

interface DocumentTypePermissionManagerProps {
  exchangeId: string;
  userRole: string;
  documentTypes: string[];
  onPermissionChange?: (documentType: string, permissions: any) => void;
  readOnly?: boolean;
}

// Document types with their default permissions
const DOCUMENT_TYPES: { [key: string]: Omit<DocumentTypePermission, 'permissions'> } = {
  'proof_of_funds': {
    documentType: 'proof_of_funds',
    label: 'Proof of Funds Letter',
    description: 'Financial verification documents for the exchange',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: true
  },
  'exchange_agreement': {
    documentType: 'exchange_agreement',
    label: 'Exchange Agreement',
    description: 'Legal agreement documents for the 1031 exchange',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: false
  },
  'property_deed': {
    documentType: 'property_deed',
    label: 'Property Deed',
    description: 'Property ownership and transfer documents',
    roleRestrictions: ['admin', 'coordinator', 'client', 'third_party'],
    requiresPIN: true
  },
  'escrow_instructions': {
    documentType: 'escrow_instructions',
    label: 'Escrow Instructions',
    description: 'Instructions for escrow handling',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: false
  },
  'identification_notice': {
    documentType: 'identification_notice',
    label: 'Property Identification Notice',
    description: '45-day identification documents',
    roleRestrictions: ['admin', 'coordinator', 'client', 'third_party'],
    requiresPIN: false
  },
  'closing_documents': {
    documentType: 'closing_documents',
    label: 'Closing Documents',
    description: 'Final closing and settlement documents',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: true
  },
  'tax_documents': {
    documentType: 'tax_documents',
    label: 'Tax Documents',
    description: 'IRS and tax-related documentation',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: true
  },
  'compliance_reports': {
    documentType: 'compliance_reports',
    label: 'Compliance Reports',
    description: 'Regulatory compliance and audit documents',
    roleRestrictions: ['admin', 'coordinator'],
    requiresPIN: false
  },
  'correspondence': {
    documentType: 'correspondence',
    label: 'General Correspondence',
    description: 'Letters, emails, and general communication',
    roleRestrictions: ['admin', 'coordinator', 'client', 'third_party', 'agency'],
    requiresPIN: false
  },
  'financial_statements': {
    documentType: 'financial_statements',
    label: 'Financial Statements',
    description: 'Financial reports and statements',
    roleRestrictions: ['admin', 'coordinator', 'client'],
    requiresPIN: true
  }
};

export const DocumentTypePermissionManager: React.FC<DocumentTypePermissionManagerProps> = ({
  exchangeId,
  userRole,
  documentTypes,
  onPermissionChange,
  readOnly = false
}) => {
  const { permissions: exchangePermissions } = useExchangePermissions(exchangeId);
  const [documentPermissions, setDocumentPermissions] = useState<DocumentTypePermission[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    initializeDocumentPermissions();
  }, [userRole, documentTypes]);

  const initializeDocumentPermissions = () => {
    const permissions = documentTypes.map(docType => {
      const typeConfig = DOCUMENT_TYPES[docType] || {
        documentType: docType,
        label: docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Documents of type: ${docType}`,
        roleRestrictions: ['admin', 'coordinator', 'client'],
        requiresPIN: false
      };

      const hasAccess = typeConfig.roleRestrictions?.includes(userRole) || userRole === 'admin';
      
      return {
        ...typeConfig,
        permissions: {
          view: hasAccess,
          download: hasAccess && (exchangePermissions?.can_download_documents ?? true),
          upload: hasAccess && (exchangePermissions?.can_upload_documents ?? false)
        }
      };
    });

    setDocumentPermissions(permissions);
  };

  const updatePermission = (documentType: string, permissionType: 'view' | 'download' | 'upload', value: boolean) => {
    if (readOnly) return;

    setDocumentPermissions(prev => prev.map(doc => {
      if (doc.documentType === documentType) {
        const updatedPermissions = {
          ...doc.permissions,
          [permissionType]: value
        };

        // If view is disabled, disable download and upload too
        if (permissionType === 'view' && !value) {
          updatedPermissions.download = false;
          updatedPermissions.upload = false;
        }

        // If download is enabled, ensure view is enabled
        if (permissionType === 'download' && value) {
          updatedPermissions.view = true;
        }

        // If upload is enabled, ensure view is enabled
        if (permissionType === 'upload' && value) {
          updatedPermissions.view = true;
        }

        const updated = {
          ...doc,
          permissions: updatedPermissions
        };

        onPermissionChange?.(documentType, updatedPermissions);
        return updated;
      }
      return doc;
    }));
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'coordinator':
        return <Settings className="w-4 h-4 text-blue-600" />;
      case 'agency':
        return <Building className="w-4 h-4 text-orange-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'coordinator': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      case 'third_party': return 'bg-yellow-100 text-yellow-800';
      case 'agency': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPermissions = filterRole === 'all' 
    ? documentPermissions 
    : documentPermissions.filter(doc => doc.roleRestrictions?.includes(filterRole));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Document Type Permissions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage download and access permissions for different document types
          </p>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="coordinator">Coordinator</option>
            <option value="client">Client</option>
            <option value="third_party">Third Party</option>
            <option value="agency">Agency</option>
          </select>
        </div>
      </div>

      {/* Current User Role Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        {getRoleIcon(userRole)}
        <span className="text-sm font-medium text-blue-900">
          Current Role: <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userRole)}`}>
            {userRole.replace('_', ' ').toUpperCase()}
          </span>
        </span>
      </div>

      {/* Document Type Permissions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allowed Roles
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  View
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Download
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIN Required
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((doc) => (
                <tr key={doc.documentType} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.label}</div>
                        <div className="text-xs text-gray-500">{doc.description}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.roleRestrictions?.map(role => (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                        >
                          {getRoleIcon(role)}
                          {role.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {readOnly ? (
                      getPermissionIcon(doc.permissions.view)
                    ) : (
                      <button
                        onClick={() => updatePermission(doc.documentType, 'view', !doc.permissions.view)}
                        className="p-1 rounded hover:bg-gray-100"
                        disabled={!doc.roleRestrictions?.includes(userRole) && userRole !== 'admin'}
                      >
                        {getPermissionIcon(doc.permissions.view)}
                      </button>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {readOnly ? (
                      getPermissionIcon(doc.permissions.download)
                    ) : (
                      <button
                        onClick={() => updatePermission(doc.documentType, 'download', !doc.permissions.download)}
                        className="p-1 rounded hover:bg-gray-100"
                        disabled={!doc.permissions.view || (!doc.roleRestrictions?.includes(userRole) && userRole !== 'admin')}
                      >
                        {getPermissionIcon(doc.permissions.download)}
                      </button>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {readOnly ? (
                      getPermissionIcon(doc.permissions.upload)
                    ) : (
                      <button
                        onClick={() => updatePermission(doc.documentType, 'upload', !doc.permissions.upload)}
                        className="p-1 rounded hover:bg-gray-100"
                        disabled={!doc.permissions.view || (!doc.roleRestrictions?.includes(userRole) && userRole !== 'admin')}
                      >
                        {getPermissionIcon(doc.permissions.upload)}
                      </button>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    {doc.requiresPIN ? (
                      <div className="flex justify-center" title="PIN Required">
                        <Lock className="w-4 h-4 text-amber-600" />
                      </div>
                    ) : (
                      <div className="flex justify-center" title="No PIN Required">
                        <Unlock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Permission Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span><strong>View:</strong> Can see and preview documents</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-600" />
              <span><strong>Download:</strong> Can download documents to local device</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span><strong>PIN Required:</strong> Document requires PIN for access</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span><strong>Role Restricted:</strong> Only certain roles can access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {!readOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-900">Permission Summary</h4>
          </div>
          <div className="text-sm text-blue-800">
            <p className="mb-1">
              <strong>Viewable:</strong> {documentPermissions.filter(d => d.permissions.view).length} of {documentPermissions.length} document types
            </p>
            <p className="mb-1">
              <strong>Downloadable:</strong> {documentPermissions.filter(d => d.permissions.download).length} of {documentPermissions.length} document types
            </p>
            <p>
              <strong>Uploadable:</strong> {documentPermissions.filter(d => d.permissions.upload).length} of {documentPermissions.length} document types
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTypePermissionManager;