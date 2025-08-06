import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Filter {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: Filter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  className = ''
}) => {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 font-medium">Active filters:</span>
      {filters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
        >
          <span className="font-medium">{filter.label}:</span>
          <span className="ml-1">{filter.value}</span>
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 transition-colors"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterChips;