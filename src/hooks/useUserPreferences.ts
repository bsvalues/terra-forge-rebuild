// TerraFusion OS — User Preferences Hook
// Persisted display preferences with localStorage

import { useState, useCallback, useEffect } from "react";

export interface UserPreferences {
  compactMode: boolean;
  reducedMotion: boolean;
  showMapLayers: boolean;
  trustModeDefault: boolean;
  notificationSound: boolean;
  autoSync: boolean;
}

const PREFS_KEY = "terrafusion_user_prefs";

const DEFAULT_PREFS: UserPreferences = {
  compactMode: false,
  reducedMotion: false,
  showMapLayers: true,
  trustModeDefault: false,
  notificationSound: true,
  autoSync: true,
};

function loadPrefs(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

// Global state shared across all hook instances
let globalPrefs = loadPrefs();
let prefListeners = new Set<() => void>();

function notifyPrefListeners() {
  prefListeners.forEach((fn) => fn());
}

export function useUserPreferences() {
  const [prefs, setLocalPrefs] = useState<UserPreferences>(globalPrefs);

  useEffect(() => {
    const listener = () => setLocalPrefs({ ...globalPrefs });
    prefListeners.add(listener);
    return () => { prefListeners.delete(listener); };
  }, []);

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    globalPrefs = { ...globalPrefs, [key]: value };
    localStorage.setItem(PREFS_KEY, JSON.stringify(globalPrefs));
    notifyPrefListeners();

    // Apply side effects
    if (key === "reducedMotion") {
      document.documentElement.classList.toggle("reduce-motion", value as boolean);
    }
    if (key === "compactMode") {
      document.documentElement.classList.toggle("compact", value as boolean);
    }
  }, []);

  const resetPrefs = useCallback(() => {
    globalPrefs = { ...DEFAULT_PREFS };
    localStorage.setItem(PREFS_KEY, JSON.stringify(globalPrefs));
    document.documentElement.classList.remove("reduce-motion", "compact");
    notifyPrefListeners();
  }, []);

  return { prefs, updatePref, resetPrefs };
}
