import React, { useState } from 'react';
import { EnhancedDocumentManager } from '../components';
import EnterpriseDocumentTemplateManager from '../components/EnterpriseDocumentTemplateManager';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  DocumentIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  FolderIcon,
  CalendarIcon,
  TagIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const Documents: React.FC = () => {
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const canManage = isAdmin() || isCoordinator();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      {/* Professional Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Document Management
              </h1>
              <p className="text-gray-600 text-lg">
                Secure document storage and management for your 1031 exchanges
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canManage && (
                <button
                  onClick={() => setShowTemplateManager(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                  <span>Templates</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DocumentIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Folders</p>
                <p className="text-2xl font-bold text-blue-600">--</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <FolderIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-purple-600">--</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TagIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent (7d)</p>
                <p className="text-2xl font-bold text-orange-600">--</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <CalendarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Document Manager */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EnhancedDocumentManager />
      </div>

      {/* Template Manager Modal */}
      <EnterpriseDocumentTemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onTemplateChange={() => {
          // Refresh will be handled by EnhancedDocumentManager
        }}
      />
    </div>
  );
};

export default Documents;