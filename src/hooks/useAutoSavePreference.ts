import { useState, useEffect } from 'react';

const AUTO_SAVE_PREF_KEY = 'admin_auto_save_enabled';

export function useAutoSavePreference() {
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_PREF_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setAutoSaveEnabled = (enabled: boolean) => {
    try {
      localStorage.setItem(AUTO_SAVE_PREF_KEY, enabled.toString());
      setAutoSaveEnabledState(enabled);
      
      // Dispatch a custom event so other components can sync
      window.dispatchEvent(new CustomEvent('autosave-preference-changed', {
        detail: { enabled }
      }));
    } catch {}
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTO_SAVE_PREF_KEY) {
        setAutoSaveEnabledState(e.newValue === 'true');
      }
    };
    
    const handleCustomChange = (e: CustomEvent<{enabled: boolean}>) => {
      setAutoSaveEnabledState(e.detail.enabled);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('autosave-preference-changed', handleCustomChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('autosave-preference-changed', handleCustomChange as EventListener);
    };
  }, []);

  return { autoSaveEnabled, setAutoSaveEnabled };
}
