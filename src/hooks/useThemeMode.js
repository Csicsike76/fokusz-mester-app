// src/hooks/useThemeMode.js
import { useEffect, useState, useCallback } from 'react';

const LS_KEY = 'fm_theme'; // 'light' | 'dark'

export const useThemeMode = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'light';
  });

  const apply = useCallback((t) => {
    // <html data-theme="light|dark">
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(LS_KEY, t);
    // FONTOS: overlay logika – világos módban átlátszó, sötétben sötétítsen
    const overlay = t === 'dark' ? 'rgba(30, 40, 50, 0.6)' : 'transparent';
    document.documentElement.style.setProperty('--overlay', overlay);
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme, apply]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
};
