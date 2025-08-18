import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  BuildingOfficeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Task, User, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

interface EnhancedTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Partial<Task>) => Promise<void>;
}

export const EnhancedTaskCreateModal: React.FC<EnhancedTaskCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [exchangeMembers, setExchangeMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PENDING' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    due_date: '',
    exchange_id: '',
    assigned_to: ''
  });

  // Load exchanges when modal opens
  useEffect(() => {
    if (isOpen) {
      loadExchanges();
    }
  }, [isOpen]);

  // Load exchange members when exchange is selected
  useEffect(() => {
    if (formData.exchange_id) {
      loadExchangeMembers(formData.exchange_id);
    } else {
      setExchangeMembers([]);
    }
  }, [formData.exchange_id]);

  const loadExchanges = async () => {
    try {
      const response = await apiService.get('/exchanges?limit=100');
      const exchangeList = response.data || response.exchanges || [];
      setExchanges(exchangeList);
    } catch (error) {
      console.error('Error loading exchanges:', error);
    }
  };

  const loadExchangeMembers = async (exchangeId: string) => {
    setLoadingMembers(true);
    try {
      // Get exchange participants directly from the API
      const participantsResponse = await apiService.get(`/exchanges/${exchangeId}/participants`);
      const participants = participantsResponse.data || participantsResponse.participants || [];
      
      const members: User[] = [];
      const memberIds = new Set<string>();
      
      // Process participants from the exchange_participants table
      for (const participant of participants) {
        // The API already formats the participants with firstName, lastName, email, role
        if (participant.userId || participant.id) {
          const userId = participant.userId || participant.id;
          if (!memberIds.has(userId)) {
            memberIds.add(userId);
            members.push({
              id: userId,
              first_name: participant.firstName,
              last_name: participant.lastName,
              email: participant.email,
              role: participant.role || 'participant'
            } as User);
          }
        }
      }
      
      // If no participants found, try the old method as fallback
      if (members.length === 0) {
        const exchangeResponse = await apiService.get(`/exchanges/${exchangeId}`);
        const exchange = exchangeResponse.data || exchangeResponse;
        
        const fallbackIds = new Set<string>();
        
        // Add client
        if (exchange.client_id) fallbackIds.add(exchange.client_id);
        if (exchange.client?.id) fallbackIds.add(exchange.client.id);
        
        // Add coordinator
        if (exchange.coordinator_id) fallbackIds.add(exchange.coordinator_id);
        
        // Fetch user details for fallback IDs
        for (const userId of Array.from(fallbackIds)) {
          if (!memberIds.has(userId)) {
            try {
              const userResponse = await apiService.get(`/admin/users/${userId}`);
              if (userResponse.data) {
                members.push(userResponse.data);
              }
            } catch (error) {
              console.error(`Error fetching user ${userId}:`, error);
            }
          }
        }
      }
      
      // Add current user if they're not already in the list
      if (user && !members.find(m => m.id === user.id)) {
        members.push(user);
      }
      
      setExchangeMembers(members);
    } catch (error) {
      console.error('Error loading exchange members:', error);
      
      // Fallback to just adding current user
      if (user) {
        setExchangeMembers([user]);
      } else {
        setExchangeMembers([]);
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.exchange_id) {
      alert('Please fill in required fields (Title and Exchange)');
      return;
    }
    
    setLoading(true);
    try {
      const taskData = {
        ...formData,
        exchangeId: formData.exchange_id, // Add camelCase version for middleware
        created_by: user?.id,
        created_at: new Date().toISOString()
      };
      
      await onCreate(taskData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'PENDING',
        priority: 'MEDIUM',
        due_date: '',
        exchange_id: '',
        assigned_to: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatExchangeName = (exchange: any) => {
    const clientName = exchange.client?.first_name && exchange.client?.last_name
      ? `${exchange.client.first_name} ${exchange.client.last_name}`
      : exchange.client?.email || 'Unknown Client';
    
    return `${exchange.name || exchange.title || 'Unnamed Exchange'} - ${clientName}`;
  };

  const formatUserName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name} (${user.role})`;
    }
    return `${user.email} (${user.role})`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Exchange Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                Exchange <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.exchange_id}
                onChange={(e) => setFormData(prev => ({ ...prev, exchange_id: e.target.value, assigned_to: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select an exchange</option>
                {exchanges.map((exchange) => (
                  <option key={exchange.id} value={exchange.id}>
                    {formatExchangeName(exchange)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="w-4 h-4 inline mr-1" />
                Assign To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!formData.exchange_id || loadingMembers}
              >
                <option value="">Unassigned</option>
                {loadingMembers ? (
                  <option disabled>Loading members...</option>
                ) : (
                  exchangeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {formatUserName(member)}
                    </option>
                  ))
                )}
              </select>
              {formData.exchange_id && !loadingMembers && exchangeMembers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No members found for this exchange</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task description (optional)"
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FlagIcon className="w-4 h-4 inline mr-1" />
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.title || !formData.exchange_id}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};