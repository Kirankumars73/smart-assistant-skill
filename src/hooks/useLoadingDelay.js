import { useState, useEffect } from 'react';

/**
 * Hook to prevent loading flash for fast operations
 * Shows loading state only if operation takes longer than minimum delay
 * 
 * @param {boolean} isLoading - Whether data is currently loading
 * @param {number} minDelay - Minimum delay before showing loading (ms)
 * @returns {boolean} - Whether to show loading state
 */
export const useLoadingDelay = (isLoading, minDelay = 300) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Only show loading if operation takes longer than minDelay
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, minDelay);

      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, minDelay]);

  return showLoading;
};

/**
 * Hook for managing loading states with minimum display time
 * Ensures loading indicator shows for at least minDuration
 * 
 * @param {number} minDuration - Minimum time to show loading (ms)
 * @returns {object} - { isLoading, startLoading, stopLoading }
 */
export const useMinimumLoading = (minDuration = 500) => {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const startLoading = () => {
    setIsLoading(true);
    setStartTime(Date.now());
  };

  const stopLoading = () => {
    if (!startTime) {
      setIsLoading(false);
      return;
    }

    const elapsed = Date.now() - startTime;
    const remaining = minDuration - elapsed;

    if (remaining > 0) {
      setTimeout(() => {
        setIsLoading(false);
        setStartTime(null);
      }, remaining);
    } else {
      setIsLoading(false);
      setStartTime(null);
    }
  };

  return { isLoading, startLoading, stopLoading };
};

export default useLoadingDelay;
