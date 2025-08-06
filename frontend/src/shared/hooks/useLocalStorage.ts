import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

interface UseLocalStorageOptions {
  syncAcrossTabs?: boolean;
  ttl?: number; // Time to live in milliseconds
}

interface StorageValue<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): [T, (value: SetValue<T>) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed: StorageValue<T> = JSON.parse(item);
      
      // Check if value has expired
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        window.localStorage.removeItem(key);
        return initialValue;
      }
      
      return parsed.value;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Write to localStorage
  const setValue = useCallback((value: SetValue<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        const storageValue: StorageValue<T> = {
          value: valueToStore,
          timestamp: Date.now(),
          ttl: options.ttl
        };
        
        window.localStorage.setItem(key, JSON.stringify(storageValue));
        
        // Dispatch custom event for cross-tab synchronization
        if (options.syncAcrossTabs !== false) {
          window.dispatchEvent(new CustomEvent('local-storage', {
            detail: { key, value: valueToStore }
          }));
        }
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, options.ttl, options.syncAcrossTabs]);

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
        
        // Dispatch custom event for cross-tab synchronization
        if (options.syncAcrossTabs !== false) {
          window.dispatchEvent(new CustomEvent('local-storage', {
            detail: { key, value: null }
          }));
        }
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, options.syncAcrossTabs]);

  // Handle storage change events (for cross-tab synchronization)
  useEffect(() => {
    if (typeof window === 'undefined' || options.syncAcrossTabs === false) {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed: StorageValue<T> = JSON.parse(e.newValue);
          
          // Check if value has expired
          if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
          } else {
            setStoredValue(parsed.value);
          }
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        if (e.detail.value === null) {
          setStoredValue(initialValue);
        } else {
          setStoredValue(e.detail.value);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleCustomStorageChange as EventListener);
    };
  }, [key, initialValue, options.syncAcrossTabs]);

  // Check for expired values periodically
  useEffect(() => {
    if (!options.ttl) return;

    const interval = setInterval(() => {
      const currentValue = readValue();
      if (currentValue !== storedValue) {
        setStoredValue(currentValue);
      }
    }, Math.min(options.ttl / 10, 60000)); // Check at most every minute

    return () => clearInterval(interval);
  }, [options.ttl, readValue, storedValue]);

  return [storedValue, setValue, removeValue];
}

// Helper hook for managing multiple localStorage values
export function useLocalStorageManager() {
  const getItem = useCallback(<T>(key: string): T | null => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return null;
      
      const parsed: StorageValue<T> = JSON.parse(item);
      
      if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
        window.localStorage.removeItem(key);
        return null;
      }
      
      return parsed.value;
    } catch {
      return null;
    }
  }, []);

  const setItem = useCallback(<T>(key: string, value: T, ttl?: number) => {
    try {
      const storageValue: StorageValue<T> = {
        value,
        timestamp: Date.now(),
        ttl
      };
      window.localStorage.setItem(key, JSON.stringify(storageValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, []);

  const removeItem = useCallback((key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.clear();
    } catch (error) {
      console.warn('Error clearing localStorage:', error);
    }
  }, []);

  const getStorageSize = useCallback((): number => {
    let size = 0;
    for (const key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        size += window.localStorage[key].length + key.length;
      }
    }
    return size;
  }, []);

  return {
    getItem,
    setItem,
    removeItem,
    clear,
    getStorageSize
  };
}