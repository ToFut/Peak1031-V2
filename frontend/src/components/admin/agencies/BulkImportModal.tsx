/**
 * Bulk Import Modal Component
 * Import multiple agencies from CSV/JSON
 */

import React, { useState } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { BulkImportRequest } from '../../../services/agencyApi';

interface BulkImportModalProps {
  onImport: (data: BulkImportRequest) => Promise<void>;
  onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [createUsers, setCreateUsers] = useState(false);
  const [sendEmails, setSendEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        if (selectedFile.name.endsWith('.json')) {
          const data = JSON.parse(text);
          setParsedData(Array.isArray(data) ? data : [data]);
        } else if (selectedFile.name.endsWith('.csv')) {
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
          setParsedData(data);
        }
      } catch (err) {
        setError('Failed to parse file. Please check the format.');
        setParsedData([]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      setError('No data to import');
      return;
    }

    setLoading(true);
    try {
      await onImport({
        agencies: parsedData,
        options: {
          createUsers,
          sendWelcomeEmails: sendEmails
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@agency.com',
        company: 'Doe Agency',
        phone: '555-0100',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      }
    ];
    
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agency_import_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Bulk Import Agencies</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (CSV or JSON)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv,.json"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV or JSON up to 10MB</p>
              </div>
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                {file.name} ({parsedData.length} agencies)
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              Download import template
            </button>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="createUsers"
                checked={createUsers}
                onChange={(e) => setCreateUsers(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="createUsers" className="ml-2 text-sm text-gray-700">
                Create user accounts for agencies
              </label>
            </div>
            {createUsers && (
              <div className="flex items-center ml-6">
                <input
                  type="checkbox"
                  id="sendEmails"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendEmails" className="ml-2 text-sm text-gray-700">
                  Send welcome emails to new users
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Preview (first 5)</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.first_name} {item.last_name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.email}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || parsedData.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Importing...' : `Import ${parsedData.length} Agencies`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;