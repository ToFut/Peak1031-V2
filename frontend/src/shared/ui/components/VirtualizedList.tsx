import React from 'react';

interface VirtualizedListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  className?: string;
}

export const VirtualizedList: React.FC<VirtualizedListProps> = ({ 
  items, 
  renderItem, 
  height = 400, 
  className 
}) => {
  return (
    <div 
      className={`overflow-auto ${className}`} 
      style={{ height }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};