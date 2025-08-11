import { useState, useEffect, useRef } from 'react';

interface UseDelayedTooltipOptions {
  delay?: number; // Delay in milliseconds
  enabled?: boolean; // Whether the delayed tooltip is enabled
}

export const useDelayedTooltip = ({ delay = 4000, enabled = true }: UseDelayedTooltipOptions = {}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!enabled) return;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    showTooltip,
    handleMouseEnter,
    handleMouseLeave,
  };
};




