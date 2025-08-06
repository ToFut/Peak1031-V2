import React from 'react';

interface ModernDropdownProps {
  children?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{value: string; label: string}>;
  className?: string;
}

const ModernDropdown: React.FC<ModernDropdownProps> = ({ children, value, onChange, options, className }) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)}
      className={`border rounded px-3 py-2 ${className}`}
    >
      {options?.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
};

export default ModernDropdown;