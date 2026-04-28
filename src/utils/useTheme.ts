import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@theme_mode';

export interface ThemeState {
  /** The resolved theme actually applied ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** The user's preference ('light' | 'dark' | 'system') */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export function useTheme(): ThemeState {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // non-critical
    }
  }, []);

  const theme: 'light' | 'dark' = mode === 'system' ? (systemScheme ?? 'light') : mode;

  return { theme, mode, setMode };
}
