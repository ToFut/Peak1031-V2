import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Exchange } from '../../../types';
import { ColumnConfig, AVAILABLE_COLUMNS } from './CustomizableColumns';
import { useViewPreferences, VIEW_PREFERENCE_KEYS } from '../../../hooks/useViewPreferences';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Settings,
  Eye
} from 'lucide-react';

interface CustomizableTableViewProps {
  exchanges: Exchange[];
  onExchangeClick: (exchange: Exchange) => void;
  onColumnsChange: () => void;
}

export const CustomizableTableView: React.FC<CustomizableTableViewProps> = ({
  exchanges,
  onExchangeClick,
  onColumnsChange
}) => {
  const navigate = useNavigate();
  
  // Column preferences
  const { 
    viewType: savedColumns, 
    setViewType: setSavedColumns,
    loading: columnsLoading 
  } = useViewPreferences(
    VIEW_PREFERENCE_KEYS.EXCHANGE_TABLE_COLUMNS, 
    AVAILABLE_COLUMNS.map((col, index) => ({
      ...col,
      visible: ['exchangeNumber', 'name', 'status', 'client', 'exchangeValue', 'progress'].includes(col.key),
      order: index
    }))
  );

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Get columns configuration
  const columns = useMemo(() => {
    if (columnsLoading || !savedColumns) {
      // Default columns while loading
      return AVAILABLE_COLUMNS.map((col, index) => ({
        ...col,
        visible: ['exchangeNumber', 'name', 'status', 'client', 'exchangeValue', 'progress'].includes(col.key),
        order: index
      }));
    }
    
    // Ensure savedColumns is an array
    const columnsArray = Array.isArray(savedColumns) ? savedColumns : [];
    
    // Sort by order and filter visible columns
    return columnsArray
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .filter(col => col.visible);
  }, [savedColumns, columnsLoading]);

  // Handle column updates
  const handleColumnsUpdate = (newColumns: ColumnConfig[]) => {
    setSavedColumns(newColumns);
    onColumnsChange();
  };

  // Sorting functionality
  const sortedExchanges = useMemo(() => {
    if (!sortConfig) return exchanges;

    return [...exchanges].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [exchanges, sortConfig]);

  // Helper function to get nested object values
  const getNestedValue = (obj: any, path: string): any => {
    if (path.includes('.')) {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    return obj[path];
  };

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return null; // Clear sorting
        }
      }
      return { key, direction: 'asc' };
    });
  };

  // Get sort indicator for column
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  if (exchanges.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border p-12 text-center">
        <div className="text-gray-500">No exchanges to display</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      {/* Table Header with Controls */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Exchanges ({exchanges.length})
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onColumnsChange}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Customize columns"
          >
            <Settings className="w-4 h-4 mr-1" />
            Columns
          </button>
          
          {sortConfig && (
            <button
              onClick={() => setSortConfig(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Sort
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const availableColumn = AVAILABLE_COLUMNS.find(col => col.key === column.key);
                const IconComponent = availableColumn?.icon;
                
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none transition-colors"
                    style={{ width: column.width }}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-2">
                      {IconComponent && <IconComponent className="w-4 h-4 text-gray-400" />}
                      <span>{column.label}</span>
                      <div className="ml-auto">
                        {getSortIcon(column.key)}
                      </div>
                    </div>
                  </th>
                );
              })}
              
              {/* Actions column */}
              <th scope="col" className="relative px-6 py-3 w-20">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedExchanges.map((exchange, index) => (
              <tr
                key={exchange.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onExchangeClick(exchange)}
              >
                {columns.map((column) => {
                  const availableColumn = AVAILABLE_COLUMNS.find(col => col.key === column.key);
                  const value = getNestedValue(exchange, column.key);
                  
                  return (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {availableColumn?.formatter ? (
                        availableColumn.formatter(value, exchange)
                      ) : (
                        <span className="text-sm text-gray-900">
                          {value?.toString() || 'N/A'}
                        </span>
                      )}
                    </td>
                  );
                })}
                
                {/* Actions column */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      to={`/exchanges/${exchange.id}`}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      onClick={(e) => e.stopPropagation()}
                      title="View exchange"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/exchanges/${exchange.id}`, '_blank');
                      }}
                      className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with summary info */}
      {sortedExchanges.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                Showing {sortedExchanges.length} exchange{sortedExchanges.length !== 1 ? 's' : ''}
              </span>
              {sortConfig && (
                <span className="text-blue-600">
                  Sorted by {columns.find(col => col.key === sortConfig.key)?.label} ({sortConfig.direction})
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span>
                {columns.filter(col => col.visible).length} of {AVAILABLE_COLUMNS.length} columns visible
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizableTableView;