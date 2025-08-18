import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';

interface QuickTaskCreateProps {
  exchangeId?: string;
  onTaskCreated?: (task: any) => void;
  className?: string;
}

export const QuickTaskCreate: React.FC<QuickTaskCreateProps> = ({ 
  exchangeId, 
  onTaskCreated, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newTask = {
        title: title.trim(),
        status: 'PENDING',
        priority: 'MEDIUM',
        exchange_id: exchangeId,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      const response = await apiService.post('/tasks', newTask);
      
      if (onTaskCreated) {
        onTaskCreated(response.data || response);
      }
      
      setTitle('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setTitle('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      >
        <PlusIcon className="w-4 h-4" />
        <span>Add task...</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        className="w-full text-sm border-0 outline-none bg-transparent placeholder-gray-500"
        disabled={isCreating}
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!title.trim() || isCreating}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-3 h-3" />
            {isCreating ? 'Adding...' : 'Add Task'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle('');
            }}
            className="flex items-center gap-1 px-3 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
          >
            <XMarkIcon className="w-3 h-3" />
            Cancel
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Press Enter to add, Escape to cancel
        </div>
      </div>
    </form>
  );
};