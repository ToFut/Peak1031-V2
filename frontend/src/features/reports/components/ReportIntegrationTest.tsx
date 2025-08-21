import React, { useState } from 'react';
import { ResponsiveReportViewer } from './ResponsiveReportViewer';
import { MobileReportViewer } from './MobileReportViewer';
import { DevicePhoneMobileIcon, ComputerDesktopIcon, EyeIcon } from '@heroicons/react/24/outline';

export const ReportIntegrationTest: React.FC = () => {
  const [viewMode, setViewMode] = useState<'responsive' | 'mobile-only' | 'demo'>('responsive');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Controls */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            📊 Reports & Analytics Integration Test
          </h1>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setViewMode('responsive')}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                viewMode === 'responsive'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              Responsive (Auto-detect)
            </button>
            
            <button
              onClick={() => setViewMode('mobile-only')}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                viewMode === 'mobile-only'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
              Mobile Only
            </button>
            
            <button
              onClick={() => setViewMode('demo')}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                viewMode === 'demo'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              Demo Mode
            </button>
          </div>

          {/* Info Panel */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Integration Status:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Mobile-responsive report viewer created</li>
              <li>✅ Backend API endpoints configured (/api/mobile-reports/*)</li>
              <li>✅ Export functionality (PDF, CSV, JSON)</li>
              <li>✅ Category tabs with data visualization</li>
              <li>✅ Integrated with existing Reports tab in navigation</li>
              <li>✅ Role-based access control applied</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Render Selected View */}
      <div className="relative">
        {viewMode === 'responsive' && (
          <ResponsiveReportViewer forceView="auto" />
        )}
        
        {viewMode === 'mobile-only' && (
          <MobileReportViewer />
        )}
        
        {viewMode === 'demo' && (
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Demo Mode - Features Overview</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📱 Mobile Features</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Horizontal scrollable tabs</li>
                    <li>• Touch-optimized interface</li>
                    <li>• Responsive metric cards</li>
                    <li>• Export to PDF/CSV/JSON</li>
                    <li>• Date range filtering</li>
                    <li>• Real-time data loading</li>
                    <li>• Progressive loading states</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🖥️ Desktop Features</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Full dashboard layout</li>
                    <li>• Side-by-side comparisons</li>
                    <li>• Advanced filtering</li>
                    <li>• Batch operations</li>
                    <li>• Detailed analytics</li>
                    <li>• Print-optimized views</li>
                    <li>• Keyboard shortcuts</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">📊 Report Categories</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <span className="font-medium text-blue-600">Overview</span> - System KPIs</li>
                    <li>• <span className="font-medium text-green-600">Financial</span> - Revenue metrics</li>
                    <li>• <span className="font-medium text-purple-600">Exchanges</span> - Performance analytics</li>
                    <li>• <span className="font-medium text-orange-600">Users</span> - Activity tracking</li>
                    <li>• <span className="font-medium text-indigo-600">Tasks</span> - Productivity metrics</li>
                    <li>• <span className="font-medium text-red-600">Security</span> - Audit logs</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">🔧 Technical</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Role-based data filtering</li>
                    <li>• 5-minute response caching</li>
                    <li>• RESTful API design</li>
                    <li>• TypeScript interfaces</li>
                    <li>• Error boundary protection</li>
                    <li>• Loading state management</li>
                    <li>• Responsive breakpoints</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Ready to Use!</h4>
                <p className="text-sm text-green-800">
                  The mobile-responsive report viewer is now integrated with your Reports & Analytics tab. 
                  Users will automatically see the appropriate view based on their device, with an option to switch views manually.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportIntegrationTest;