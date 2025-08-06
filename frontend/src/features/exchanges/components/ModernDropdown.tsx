import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DropdownOption {
  value: string;
  label: string;
}

interface ModernDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const ModernDropdown: React.FC<ModernDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  className = '',
  placeholder = 'Select...'
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(opt => opt.value === value);

  return (
    <div className={`relative inline-block w-56 ${className}`}>
      <button
        type="button"
        className="w-full bg-white border border-gray-300 rounded-lg shadow-sm pl-4 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        tabIndex={0}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 ml-2 transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`} 
        />
      </button>
      {open && (
        <ul className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in-0 zoom-in-95 duration-100">
          {options.map(opt => (
            <li
              key={opt.value}
              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                opt.value === value 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'text-gray-900'
              }`}
              onMouseDown={() => { 
                onChange(opt.value); 
                setOpen(false); 
              }}
              tabIndex={0}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ModernDropdown;