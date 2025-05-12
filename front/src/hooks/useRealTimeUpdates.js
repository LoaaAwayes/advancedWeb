import { useEffect } from 'react';
import { useData } from '../context/DataContext';

/**
 * Hook for ensuring real-time updates when localStorage data changes
 * @param {Function} callback Optional callback to run when data is refreshed
 */
export function useRealTimeUpdates(callback) {
  const { loadData } = useData();

  useEffect(() => {
    // Function to handle storage events
    const handleStorageChange = (e) => {
      if (['students', 'projects', 'tasks', 'messages'].includes(e.key)) {
        loadData();
        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    };

    // Add event listener for storage events
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for internal updates
    const handleCustomEvent = () => {
      loadData();
      if (callback && typeof callback === 'function') {
        callback();
      }
    };
    window.addEventListener('dataUpdated', handleCustomEvent);

    // Clean up event listeners
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataUpdated', handleCustomEvent);
    };
  }, [loadData, callback]);
}