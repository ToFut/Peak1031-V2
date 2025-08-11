import React, { useState } from 'react';
import { FileText, Download, Upload, Search, Filter, Trash2 } from 'lucide-react';
import { Document } from '../../../types';
import { formatDate } from '../../../utils/date.utils';

interface DocumentsListProps {
  documents: Document[];
  onUploadClick: () => void;
  onDownload: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  canUpload: boolean;
  canDelete: boolean;
}

export const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  onUploadClick,
  onDownload,
  onDelete,
  canUpload,
  canDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredDocuments = documents.filter(doc => {
    const docName = doc.original_filename || doc.originalFilename || doc.filename || '';
    const matchesSearch = docName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category || 'general')))];

  return (
    <div className="space-y-4">
      {/* Header with search and upload */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {canUpload && (
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Documents list */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {doc.original_filename || doc.originalFilename || doc.filename || 'Untitled Document'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {doc.category || 'General'} • 
                      Uploaded {formatDate(doc.created_at || doc.createdAt)} 
                      {doc.uploaded_by_name && ` by ${doc.uploaded_by_name}`}
                      {doc.file_size && ` • ${(doc.file_size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onDownload(doc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {canDelete && onDelete && (
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};