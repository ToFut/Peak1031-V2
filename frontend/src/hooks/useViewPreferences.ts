import { useEffect, useState, useCallback } from 'react';

export const VIEW_PREFERENCE_KEYS = {
  EXCHANGE_LIST: 'exchange_list_view',
  DOCUMENT_LIST: 'document_list_view',
  TASK_LIST: 'task_list_view',
  EXCHANGE_TABLE_COLUMNS: 'exchange_table_columns'
} as const;

type ViewType = 'grid' | 'table' | string | any;

export function useViewPreferences<T = ViewType>(storageKey: string, defaultView: T) {
  const key = `viewPref:${storageKey}`;
  const [viewType, setViewTypeState] = useState<T>(defaultView);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setViewTypeState(parsed);
      }
    } catch (_) {
      // ignore storage errors or invalid JSON
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setViewType = useCallback((next: T) => {
    setViewTypeState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch (_) {
      // ignore storage errors
    }
  }, [key]);

  return { viewType, setViewType, loading } as const;
}


