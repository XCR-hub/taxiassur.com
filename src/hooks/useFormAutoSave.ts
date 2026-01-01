import { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';

interface AutoSaveOptions {
  key: string;
  delay?: number;
  onSave?: (data: any) => Promise<void>;
  onRestore?: (data: any) => void;
}

export function useFormAutoSave<T extends Record<string, any>>(
  formData: T,
  options: AutoSaveOptions
) {
  const { key, delay = 1000, onSave, onRestore } = options;
  const debouncedData = useDebounce(formData, delay);
  const isInitialMount = useRef(true);
  const lastSavedData = useRef<string>('');

  const saveToLocalStorage = useCallback(
    (data: T) => {
      try {
        const serialized = JSON.stringify(data);
        if (serialized !== lastSavedData.current) {
          localStorage.setItem(`autosave_${key}`, serialized);
          lastSavedData.current = serialized;
        }
      } catch (error) {
        console.error('Failed to save form data:', error);
      }
    },
    [key]
  );

  const restoreFromLocalStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to restore form data:', error);
    }
    return null;
  }, [key]);

  const clearSavedData = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
    lastSavedData.current = '';
  }, [key]);

  useEffect(() => {
    const restored = restoreFromLocalStorage();
    if (restored && onRestore) {
      onRestore(restored);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    saveToLocalStorage(debouncedData);

    if (onSave) {
      onSave(debouncedData).catch(console.error);
    }
  }, [debouncedData, saveToLocalStorage, onSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const saved = restoreFromLocalStorage();
      const current = JSON.stringify(formData);
      const savedStr = JSON.stringify(saved);

      if (saved && current !== savedStr) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, restoreFromLocalStorage]);

  return {
    clearSavedData,
    restoreFromLocalStorage,
    hasSavedData: () => !!restoreFromLocalStorage(),
  };
}
