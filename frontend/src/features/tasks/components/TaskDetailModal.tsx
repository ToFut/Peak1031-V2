import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import {
  XMarkIcon,
  CalendarIcon,
  UserCircleIcon,
  TagIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  FlagIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ShareIcon,
  BellIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  LinkIcon,
  PhotoIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon
} from '@heroicons/react/24/solid';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  assignmentId?: string;
  name?: string;
}

interface Exchange {
  id: string;
  name: string;
  status: string;
}

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High Priority', icon: ExclamationTriangleIcon, color: 'red' },
  { value: 'MEDIUM', label: 'Medium Priority', icon: FlagIcon, color: 'yellow' },
  { value: 'LOW', label: 'Low Priority', icon: FlagIcon, color: 'green' }
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'To Do', icon: ClockIcon, color: 'gray' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: ArrowPathIcon, color: 'blue' },
  { value: 'REVIEW', label: 'In Review', icon: DocumentTextIcon, color: 'purple' },
  { value: 'BLOCKED', label: 'Blocked', icon: XMarkIcon, color: 'red' },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircleIcon, color: 'green' }
];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'attachments'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [exchangeParticipants, setExchangeParticipants] = useState<User[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || '',
    assignedTo: task.assignedTo || '',
    tags: (task as any).tags || [],
    estimatedHours: (task as any).estimatedHours || 0,
    actualHours: (task as any).actualHours || 0,
    starred: (task as any).starred || false
  });

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const firstName = user.firstName || user.first_name;
      const lastName = user.lastName || user.last_name;
      return firstName && lastName ? `${firstName} ${lastName}` : userId;
    }
    return userId;
  };

  // Get exchange name by ID
  const getExchangeName = (exchangeId: string) => {
    if (exchangeId === 'no-exchange') return 'Unassigned Tasks';
    const exchange = exchanges.find(ex => ex.id === exchangeId);
    return exchange?.name || `Exchange ${exchangeId}`;
  };

  // Load exchange participants if task has an exchange
  const loadExchangeParticipants = async () => {
    if (task.exchangeId || task.exchange_id) {
      try {
        const participants = await apiService.getExchangeParticipants(task.exchangeId || task.exchange_id || '');
        setExchangeParticipants(Array.isArray(participants) ? participants : []);
      } catch (error) {
        console.error('Failed to load exchange participants:', error);
        setExchangeParticipants([]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTaskDetails();
      loadExchangeParticipants();
    }
  }, [isOpen, task.id]);

  const loadTaskDetails = async () => {
    try {
      // Load users and exchanges for assignment dropdown
      const [usersResponse, exchangesResponse] = await Promise.all([
        apiService.getUsers(),
        apiService.getExchanges()
      ]);
      
      const usersData = (usersResponse as any)?.data || usersResponse;
      setUsers(Array.isArray(usersData) ? usersData : []);
      
      const exchangesData = (exchangesResponse as any)?.data || exchangesResponse;
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);

      // Load comments, attachments, and activity
      // const [commentsRes, attachmentsRes, activityRes] = await Promise.all([
      //   apiService.getTaskComments(task.id),
      //   apiService.getTaskAttachments(task.id),
      //   apiService.getTaskActivity(task.id)
      // ]);
      // setComments(commentsRes);
      // setAttachments(attachmentsRes);
      // setActivity(activityRes);
    } catch (error) {
      console.error('Failed to load task details:', error);
    }
  };

  const handleSave = async () => {
    try {
      await onUpdate(task.id, formData);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(task.id);
      onClose();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      // await apiService.addTaskComment(task.id, newComment);
      setComments([...comments, {
        id: Date.now().toString(),
        text: newComment,
        author: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'You',
        createdAt: new Date().toISOString()
      }]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await onUpdate(task.id, { status: newStatus });
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    await onUpdate(task.id, { priority: newPriority });
    setFormData(prev => ({ ...prev, priority: newPriority }));
  };

  const handleStarToggle = async () => {
    const newStarred = !formData.starred;
    await onUpdate(task.id, { starred: newStarred } as any);
    setFormData(prev => ({ ...prev, starred: newStarred }));
  };

  if (!isOpen) return null;

  const currentStatus = STATUS_OPTIONS.find(s => s.value === formData.status) || STATUS_OPTIONS[0];
  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === formData.priority) || PRIORITY_OPTIONS[1];
  const isOverdue = formData.dueDate && new Date(formData.dueDate) < new Date() && formData.status !== 'COMPLETED';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${currentStatus.color}-100`}>
                <currentStatus.icon className={`w-5 h-5 text-${currentStatus.color}-600`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="text-lg font-semibold bg-white px-2 py-1 rounded border border-gray-300"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold text-gray-900">{formData.title}</h2>
                  )}
                  <button onClick={handleStarToggle} className="p-1">
                    {formData.starred ? (
                      <StarSolidIcon className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
                    )}
                  </button>
                  {isOverdue && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Created {new Date(task.createdAt || '').toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {}}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <DocumentDuplicateIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {}}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status Dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${currentStatus.color}-100 text-${currentStatus.color}-700 hover:bg-${currentStatus.color}-200`}>
                  <currentStatus.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentStatus.label}</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value as TaskStatus)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <status.icon className={`w-4 h-4 text-${status.color}-600`} />
                      <span>{status.label}</span>
                      {status.value === currentStatus.value && (
                        <CheckCircleIcon className="w-4 h-4 ml-auto text-purple-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${currentPriority.color}-100 text-${currentPriority.color}-700 hover:bg-${currentPriority.color}-200`}>
                  <currentPriority.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{currentPriority.label}</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>

              {/* Assignee Quick Change */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                  <UserCircleIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {formData.assignedTo ? getUserName(formData.assignedTo) : 'Unassigned'}
                  </span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 max-h-60 overflow-y-auto">
                  <div className="py-1">
                    {/* Unassigned option */}
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, assignedTo: '' }));
                        onUpdate(task.id, { assignedTo: '' });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <UserCircleIcon className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-500">Unassigned</span>
                    </button>
                    
                    {/* Exchange participants first */}
                    {exchangeParticipants.length > 0 && (
                      <>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          Exchange Participants
                        </div>
                        {(Array.isArray(exchangeParticipants) ? exchangeParticipants : []).map(participant => (
                          <button
                            key={participant.id}
                            onClick={() => {
                              const assigneeId = participant.id;
                              setFormData(prev => ({ ...prev, assignedTo: assigneeId }));
                              onUpdate(task.id, { assignedTo: assigneeId });
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                          >
                            <UserCircleIcon className="w-4 h-4 mr-2 text-purple-500" />
                            <div>
                              <div className="font-medium">
                                {participant.name || `${participant.firstName} ${participant.lastName}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {participant.role || 'Participant'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    
                    {/* Assignment Options */}
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                      Assignment Options
                    </div>
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, assignedTo: '' }));
                        onUpdate(task.id, { assignedTo: '' });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <UserCircleIcon className="w-4 h-4 mr-2 text-gray-500" />
                      <div>
                        <div className="font-medium">Unassigned</div>
                        <div className="text-xs text-gray-500">No assignment</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, assignedTo: 'ALL' }));
                        onUpdate(task.id, { assignedTo: 'ALL', metadata: { notify_all_users: true } });
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                    >
                      <UserGroupIcon className="w-4 h-4 mr-2 text-green-500" />
                      <div>
                        <div className="font-medium">All Users (Notify Everyone)</div>
                        <div className="text-xs text-gray-500">Notify all users in the system</div>
                      </div>
                    </button>
                    
                    {/* All users */}
                    {(Array.isArray(users) ? users : []).length > 0 && (
                      <>
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                          All Users
                        </div>
                        {(Array.isArray(users) ? users : []).map(user => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, assignedTo: user.id }));
                              onUpdate(task.id, { assignedTo: user.id });
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                          >
                            <UserCircleIcon className="w-4 h-4 mr-2 text-blue-500" />
                            <div>
                              <div className="font-medium">
                                {`${user.firstName} ${user.lastName}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.email} - {user.role}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {PRIORITY_OPTIONS.map(priority => (
                    <button
                      key={priority.value}
                      onClick={() => handlePriorityChange(priority.value as TaskPriority)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <priority.icon className={`w-4 h-4 text-${priority.color}-600`} />
                      <span>{priority.label}</span>
                      {priority.value === currentPriority.value && (
                        <CheckCircleIcon className="w-4 h-4 ml-auto text-purple-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              {formData.dueDate && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  <CalendarIcon className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(formData.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Assignee */}
              {formData.assignedTo && (
                <div className="group relative">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors cursor-help">
                    <span className="text-sm font-medium text-purple-700">
                      {getUserName(formData.assignedTo).split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Assigned to: {getUserName(formData.assignedTo)}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <BellIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <LinkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity & Comments
              {comments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {comments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attachments'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Attachments
              {attachments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {attachments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                {editMode ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Add a description..."
                  />
                ) : (
                  <div className="prose max-w-none">
                    {formData.description || (
                      <p className="text-gray-400 italic">No description provided</p>
                    )}
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  {editMode ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:bg-gray-50"
                      >
                        <span className={formData.assignedTo ? 'text-gray-900' : 'text-gray-500'}>
                          {formData.assignedTo ? getUserName(formData.assignedTo) : 'Select assignee...'}
                        </span>
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {showAssigneeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div className="py-1">
                            {/* Unassigned option */}
                            <button
                              onClick={() => {
                                setFormData(prev => ({ ...prev, assignedTo: '' }));
                                setShowAssigneeDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                            >
                              <UserCircleIcon className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-500">Unassigned</span>
                            </button>
                            
                            {/* Exchange participants first */}
                            {exchangeParticipants.length > 0 && (
                              <>
                                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                                  Exchange Participants
                                </div>
                                                        {(Array.isArray(exchangeParticipants) ? exchangeParticipants : []).map(participant => (
                          <button
                            key={participant.id}
                            onClick={() => {
                              setFormData(prev => ({ 
                                ...prev, 
                                assignedTo: participant.id 
                              }));
                                      setShowAssigneeDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                                  >
                                    <UserCircleIcon className="w-4 h-4 mr-2 text-purple-500" />
                                    <div>
                                      <div className="font-medium">
                                        {participant.name || `${participant.firstName} ${participant.lastName}`}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {participant.role || 'Participant'}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {/* All users */}
                            {(Array.isArray(users) ? users : []).length > 0 && (
                              <>
                                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                                  All Users
                                </div>
                                {(Array.isArray(users) ? users : []).map(user => (
                                  <button
                                    key={user.id}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, assignedTo: user.id }));
                                      setShowAssigneeDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                                  >
                                    <UserCircleIcon className="w-4 h-4 mr-2 text-blue-500" />
                                    <div>
                                      <div className="font-medium">
                                        {`${user.firstName} ${user.lastName}`}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {user.email} - {user.role}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900">
                      {formData.assignedTo ? getUserName(formData.assignedTo) : 'Unassigned'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Hours
                  </label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      step="0.5"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {formData.estimatedHours || 0} hours
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Hours
                  </label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.actualHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                      step="0.5"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {formData.actualHours || 0} hours
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {tag}
                      {editMode && (
                        <button
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            tags: prev.tags.filter((t: string) => t !== tag)
                          }))}
                          className="ml-2 text-purple-500 hover:text-purple-700"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {editMode && (
                    <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-500 hover:border-gray-400">
                      + Add tag
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {/* Comment Input */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments & Activity */}
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop files here, or click to browse
                </p>
                <button className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                  Choose Files
                </button>
              </div>

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <PaperClipIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                          <p className="text-xs text-gray-500">{attachment.size}</p>
                        </div>
                      </div>
                      <button className="text-red-600 hover:text-red-700">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;