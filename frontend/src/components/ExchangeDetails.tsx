import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exchange, Task, Document } from '../types';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ExchangeChatBox } from './ExchangeChatBox';
import { TaskBoard } from './TaskBoard';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ListBulletIcon,
  FolderIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const ExchangeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents' | 'chat'>('overview');

  const loadExchangeDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [exchangeData, tasksData, documentsData] = await Promise.all([
        apiService.get(`/exchanges/${id}`),
        apiService.get(`/exchanges/${id}/tasks`),
        apiService.get(`/exchanges/${id}/documents`)
      ]);

      setExchange(exchangeData);
      setTasks(tasksData);
      setDocuments(documentsData);

    } catch (err: any) {
      console.error('Error loading exchange details:', err);
      setError(err.message || 'Failed to load exchange details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadExchangeDetails();
    }
  }, [id, loadExchangeDetails]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case '45D':
        return 'bg-yellow-100 text-yellow-800';
      case '180D':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case '45D':
      case '180D':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'TERMINATED':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: HomeIcon },
    { id: 'tasks', name: 'Tasks', icon: ListBulletIcon },
    { id: 'documents', name: 'Documents', icon: FolderIcon },
    { id: 'chat', name: 'Chat', icon: ChatBubbleLeftIcon }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !exchange) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || 'Exchange not found'}
          </h3>
          <button
            onClick={() => navigate('/exchanges')}
            className="text-blue-600 hover:text-blue-500"
          >
            Return to Exchanges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exchange.name}</h1>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">
                  Exchange #{exchange.exchangeNumber || exchange.id.slice(0, 8)}
                </span>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exchange.status)}`}>
                  {getStatusIcon(exchange.status)}
                  <span className="ml-1">{exchange.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-3">
            {user?.role === 'admin' || user?.role === 'coordinator' ? (
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Edit Exchange
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Exchange Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {exchange.exchangeValue ? formatCurrency(exchange.exchangeValue) : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Identification Deadline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {exchange.identificationDeadline ? formatDate(exchange.identificationDeadline) : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completion Deadline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {exchange.completionDate ? formatDate(exchange.completionDate) : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Exchange Type
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {exchange.exchangeType || 'Standard'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.id === 'tasks' && tasks.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tasks.length}
                  </span>
                )}
                {tab.id === 'documents' && documents.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {documents.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exchange Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Exchange Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="text-sm text-gray-900">
                    {exchange.client ? `${exchange.client.firstName} ${exchange.client.lastName}` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Exchange Type</dt>
                  <dd className="text-sm text-gray-900">{exchange.exchangeType || 'Standard 1031'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                  <dd className="text-sm text-gray-900">
                    {exchange.startDate ? formatDate(exchange.startDate) : 'N/A'}
                  </dd>
                </div>
                {exchange.relinquishedProperty && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Relinquished Property</dt>
                    <dd className="text-sm text-gray-900">
                      {exchange.relinquishedProperty.address}
                      {exchange.relinquishedProperty.sale_price && (
                        <span className="block text-gray-600">
                          Sale Price: {formatCurrency(exchange.relinquishedProperty.sale_price)}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'COMPLETED' ? 'bg-green-400' : 
                      task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {task.status === 'COMPLETED' ? 'Completed' : 
                         task.dueDate ? `Due ${formatDate(task.dueDate)}` : 'No due date'}
                      </p>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <TaskBoard tasks={tasks} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Upload Document
              </button>
            </div>
            
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{document.originalFilename}</p>
                      <p className="text-sm text-gray-500">
                        {document.category} • {document.fileSize ? (document.fileSize / 1024 / 1024).toFixed(1) : '0'} MB
                      </p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                    Download
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <ExchangeChatBox exchange={exchange} />
        )}
      </div>
    </div>
  );
};

export default ExchangeDetails;