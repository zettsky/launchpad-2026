import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS, getCommonStyles } from '../theme';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'eatwhere_theme_mode';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  function setThemeMode(newMode) {
    setMode(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const commonStyles = getCommonStyles(colors);

  return (
    <ThemeContext.Provider value={{ mode, setThemeMode, colors, commonStyles }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
