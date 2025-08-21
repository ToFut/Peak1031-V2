import React, { useState, useEffect } from 'react';
import { Exchange } from '../../../types';
import { useViewPreferences, VIEW_PREFERENCE_KEYS } from '../../../hooks/useViewPreferences';
import {
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  Check,
  X,
  Columns,
  Calendar,
  DollarSign,
  User,
  Building2,
  Clock,
  TrendingUp,
  Target,
  MapPin,
  FileText,
  Hash,
  Tag,
  Users,
  Phone,
  Mail
} from 'lucide-react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
  width?: number;
  icon?: React.ComponentType<{ className?: string }>;
  formatter?: (value: any, exchange: Exchange) => React.ReactNode;
}

interface CustomizableColumnsProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

// Available column definitions
export const AVAILABLE_COLUMNS: Omit<ColumnConfig, 'visible' | 'order'>[] = [
  {
    key: 'exchangeNumber',
    label: 'Exchange #',
    icon: Hash,
    width: 120,
    formatter: (value, exchange) => (
      <span className="font-mono text-sm">
        #{value || exchange.exchangeNumber || exchange.id.slice(-6)}
      </span>
    )
  },
  {
    key: 'name',
    label: 'Name',
    icon: FileText,
    width: 200,
    formatter: (value, exchange) => (
      <div className="truncate">
        <span className="font-medium">{value || `Exchange ${exchange.exchangeNumber}`}</span>
      </div>
    )
  },
  {
    key: 'status',
    label: 'Status',
    icon: Target,
    width: 120,
    formatter: (value) => (
      <span className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${value === 'COMPLETED' || value === 'Completed' ? 'bg-green-100 text-green-800' :
          value === 'In Progress' || value === '45D' || value === '180D' ? 'bg-blue-100 text-blue-800' :
          value === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }
      `}>
        {value}
      </span>
    )
  },
  {
    key: 'client',
    label: 'Client',
    icon: User,
    width: 180,
    formatter: (value, exchange) => (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
          {exchange.client?.firstName?.[0]}{exchange.client?.lastName?.[0]}
        </div>
        <div>
          <div className="font-medium text-sm truncate">
            {exchange.client?.firstName} {exchange.client?.lastName}
          </div>
          {exchange.client?.company && (
            <div className="text-xs text-gray-500 truncate">{exchange.client.company}</div>
          )}
        </div>
      </div>
    )
  },
  {
    key: 'exchangeType',
    label: 'Type',
    icon: Tag,
    width: 140,
    formatter: (value) => (
      <span className="text-sm text-gray-600">{value || 'Standard'}</span>
    )
  },
  {
    key: 'exchangeValue',
    label: 'Value',
    icon: DollarSign,
    width: 120,
    formatter: (value) => (
      <span className="font-medium">
        {value 
          ? new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value)
          : 'N/A'
        }
      </span>
    )
  },
  {
    key: 'progress',
    label: 'Progress',
    icon: TrendingUp,
    width: 100,
    formatter: (value, exchange) => {
      const progress = value || 0;
      return (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 
                progress >= 75 ? 'bg-blue-500' : 
                progress >= 50 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium w-8">{progress}%</span>
        </div>
      );
    }
  },
  {
    key: 'createdAt',
    label: 'Created',
    icon: Calendar,
    width: 120,
    formatter: (value) => (
      <span className="text-sm text-gray-600">
        {value ? new Date(value).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        }) : 'N/A'}
      </span>
    )
  },
  {
    key: 'identificationDeadline',
    label: '45-Day Deadline',
    icon: Target,
    width: 140,
    formatter: (value) => {
      if (!value) return <span className="text-gray-400">N/A</span>;
      
      const date = new Date(value);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return (
        <div className="text-sm">
          <div className={`font-medium ${
            diffDays < 0 ? 'text-red-600' : 
            diffDays <= 7 ? 'text-orange-600' : 
            'text-gray-900'
          }`}>
            {diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d left`}
          </div>
          <div className="text-xs text-gray-500">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      );
    }
  },
  {
    key: 'completionDeadline',
    label: '180-Day Deadline',
    icon: Clock,
    width: 140,
    formatter: (value, exchange) => {
      const deadline = value || exchange.exchangeDeadline;
      if (!deadline) return <span className="text-gray-400">N/A</span>;
      
      const date = new Date(deadline);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return (
        <div className="text-sm">
          <div className={`font-medium ${
            diffDays < 0 ? 'text-red-600' : 
            diffDays <= 30 ? 'text-orange-600' : 
            'text-gray-900'
          }`}>
            {diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d left`}
          </div>
          <div className="text-xs text-gray-500">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      );
    }
  },
  {
    key: 'relinquishedPropertyAddress',
    label: 'Property Address',
    icon: MapPin,
    width: 200,
    formatter: (value) => (
      <span className="text-sm text-gray-600 truncate" title={value}>
        {value || 'Not specified'}
      </span>
    )
  },
  {
    key: 'coordinator',
    label: 'Coordinator',
    icon: Users,
    width: 150,
    formatter: (value, exchange) => (
      <div className="text-sm">
        {exchange.coordinator ? (
          <div>
            <div className="font-medium">
              {exchange.coordinator.first_name} {exchange.coordinator.last_name}
            </div>
            <div className="text-xs text-gray-500">{exchange.coordinator.email}</div>
          </div>
        ) : (
          <span className="text-gray-400">Not assigned</span>
        )}
      </div>
    )
  },
  {
    key: 'updatedAt',
    label: 'Last Updated',
    icon: Clock,
    width: 120,
    formatter: (value) => (
      <span className="text-sm text-gray-600">
        {value ? new Date(value).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        }) : 'N/A'}
      </span>
    )
  }
];

export const CustomizableColumns: React.FC<CustomizableColumnsProps> = ({
  isOpen,
  onClose,
  columns,
  onColumnsChange
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  if (!isOpen) return null;

  const handleToggleColumn = (key: string) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const reorderedColumns = [...localColumns];
    const [movedColumn] = reorderedColumns.splice(fromIndex, 1);
    reorderedColumns.splice(toIndex, 0, movedColumn);
    
    // Update order values
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }));
    
    setLocalColumns(updatedColumns);
  };

  const handleReset = () => {
    // Reset to default columns configuration
    const defaultColumns = AVAILABLE_COLUMNS.map((col, index) => ({
      ...col,
      visible: ['exchangeNumber', 'name', 'status', 'client', 'exchangeValue', 'progress'].includes(col.key),
      order: index
    }));
    setLocalColumns(defaultColumns);
  };

  const handleSave = () => {
    onColumnsChange(localColumns);
    onClose();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (draggedIndex !== index) {
      handleReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const visibleCount = localColumns.filter(col => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Columns className="w-5 h-5 mr-2 text-blue-600" />
                Customize Columns
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {visibleCount} of {totalCount} columns visible
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-2">
            {localColumns.map((column, index) => {
              const availableColumn = AVAILABLE_COLUMNS.find(col => col.key === column.key);
              const IconComponent = availableColumn?.icon || FileText;
              
              return (
                <div
                  key={column.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-transparent
                    hover:bg-gray-100 cursor-move transition-all duration-200
                    ${draggedIndex === index ? 'opacity-50 border-blue-300' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{column.label}</div>
                      <div className="text-xs text-gray-500">
                        Width: {column.width || 'Auto'} • Order: {index + 1}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleColumn(column.key)}
                    className={`
                      p-2 rounded-lg transition-all duration-200
                      ${column.visible 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }
                    `}
                    title={column.visible ? 'Hide column' : 'Show column'}
                  >
                    {column.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizableColumns;