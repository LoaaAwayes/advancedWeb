import { useEffect } from 'react';
import { useData } from '../context/DataContext';

/**
 * Hook for ensuring real-time updates when localStorage data changes
 * @param {Function} callback Optional callback to run when data is refreshed
 */
export function useRealTimeUpdates(callback) {
  const { loadData } = useData();

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (['students', 'projects', 'tasks', 'messages'].includes(e.key)) {
        loadData();
        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomEvent = () => {
      loadData();
      if (callback && typeof callback === 'function') {
        callback();
      }
    };
    window.addEventListener('dataUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataUpdated', handleCustomEvent);
    };
  }, [loadData, callback]);
}