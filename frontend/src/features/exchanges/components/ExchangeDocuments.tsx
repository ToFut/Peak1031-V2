import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Filter, 
  Search,
  Sparkles,
  CheckCircle,
  Eye,
  Edit3,
  MessageSquare,
  User,
  ChevronDown
} from 'lucide-react';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { formatDate } from '../../../utils/date.utils';
import { Document } from '../../../types';

interface ExchangeDocumentsProps {
  exchangeId: string;
  documents: Document[];
  onUploadClick: () => void;
  onDownload: (document: Document) => void;
  onRefresh: () => void;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  required_fields: string[];
}

interface ExchangeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export const ExchangeDocuments: React.FC<ExchangeDocumentsProps> = ({
  exchangeId,
  documents,
  onUploadClick,
  onDownload,
  onRefresh
}) => {
  const { user } = useAuth();
  const { isAdmin, isCoordinator } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [exchangeUsers, setExchangeUsers] = useState<ExchangeUser[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [taskAssignment, setTaskAssignment] = useState({
    userId: '',
    action: 'review',
    dueDate: '',
    notes: ''
  });

  // Fetch templates and exchange users
  useEffect(() => {
    if (isAdmin() || isCoordinator()) {
      fetchTemplates();
      fetchExchangeUsers();
    }
  }, [exchangeId]);

  const fetchTemplates = async () => {
    try {
      const response = await apiService.get('/documents/templates/active');
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchExchangeUsers = async () => {
    try {
      const response = await apiService.get(`/exchanges/${exchangeId}/participants`);
      setExchangeUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching exchange users:', error);
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      await apiService.post('/documents/generate', {
        templateId: selectedTemplate,
        exchangeId: exchangeId,
        additionalData: {}
      });
      
      setShowGenerateModal(false);
      setSelectedTemplate('');
      onRefresh(); // Refresh documents list
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedDocument || !taskAssignment.userId) return;

    try {
      await apiService.post('/tasks', {
        title: `${taskAssignment.action.charAt(0).toUpperCase() + taskAssignment.action.slice(1)} Document: ${selectedDocument.original_filename}`,
        description: taskAssignment.notes || `Please ${taskAssignment.action} the attached document`,
        exchange_id: exchangeId,
        assigned_to: taskAssignment.userId,
        due_date: taskAssignment.dueDate,
        priority: 'medium',
        category: 'document_review',
        document_id: selectedDocument.id,
        action_type: taskAssignment.action
      });
      
      setShowActionModal(false);
      setSelectedDocument(null);
      setTaskAssignment({ userId: '', action: 'review', dueDate: '', notes: '' });
      alert('Task assigned successfully');
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Failed to assign task');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const docName = doc.original_filename || doc.originalFilename || doc.filename || '';
    const matchesSearch = docName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category || 'general')))];
  const canGenerateDocuments = isAdmin() || isCoordinator();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            {canGenerateDocuments && (
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate from Template</span>
              </button>
            )}
            <button
              onClick={onUploadClick}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  {doc.document_type === 'generated' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Generated
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {doc.original_filename || doc.originalFilename || doc.filename || 'Untitled Document'}
                </h4>
                
                <p className="text-sm text-gray-500 mb-3">
                  {doc.category || 'General'} • {formatDate(doc.created_at || doc.createdAt)}
                </p>
                
                {doc.uploaded_by_name && (
                  <p className="text-xs text-gray-400 mb-3">
                    Uploaded by {doc.uploaded_by_name}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onDownload(doc)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                  
                  {(isAdmin() || isCoordinator()) && (
                    <button
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowActionModal(true);
                      }}
                      className="flex items-center justify-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Document Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Generate Document from Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.category}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedTemplate && (
                <div className="text-sm text-gray-600">
                  {templates.find(t => t.id === selectedTemplate)?.description}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedTemplate('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDocument}
                disabled={!selectedTemplate || isGenerating}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showActionModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assign Document Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Required
                </label>
                <select
                  value={taskAssignment.action}
                  onChange={(e) => setTaskAssignment({...taskAssignment, action: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="review">Review</option>
                  <option value="sign">Sign</option>
                  <option value="comment">Comment</option>
                  <option value="approve">Approve</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <select
                  value={taskAssignment.userId}
                  onChange={(e) => setTaskAssignment({...taskAssignment, userId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user...</option>
                  {exchangeUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskAssignment.dueDate}
                  onChange={(e) => setTaskAssignment({...taskAssignment, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={taskAssignment.notes}
                  onChange={(e) => setTaskAssignment({...taskAssignment, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional instructions..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedDocument(null);
                  setTaskAssignment({ userId: '', action: 'review', dueDate: '', notes: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTask}
                disabled={!taskAssignment.userId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};