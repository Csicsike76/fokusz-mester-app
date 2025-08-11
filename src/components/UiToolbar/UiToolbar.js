import React, { useEffect, useState } from 'react';
import styles from './UiToolbar.module.css';


const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const UiToolbar = () => {
  // theme: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fm_theme') || 'light';
  });

  // zoom: 0.85 .. 1.25
  const [zoom, setZoom] = useState(() => {
    const saved = parseFloat(localStorage.getItem('fm_zoom'));
    return Number.isFinite(saved) ? clamp(saved, 0.85, 1.25) : 1.0;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fm_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--ui-zoom', String(zoom));
    localStorage.setItem('fm_zoom', String(zoom));
  }, [zoom]);

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const zoomIn = () => setZoom(z => clamp(parseFloat((z + 0.05).toFixed(2)), 0.85, 1.25));
  const zoomOut = () => setZoom(z => clamp(parseFloat((z - 0.05).toFixed(2)), 0.85, 1.25));

  return (
    <div className={styles.bar} role="toolbar" aria-label="Oldalvezérlők">
      <button className={styles.btn} onClick={toggleTheme}>
        {theme === 'dark' ? '🌞 Világos mód' : '🌙 Sötét mód'}
      </button>
      <div className={styles.group}>
        <button className={styles.iconBtn} onClick={zoomOut} aria-label="Kicsinyítés">−</button>
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button className={styles.iconBtn} onClick={zoomIn} aria-label="Nagyítás">+</button>
      </div>
    </div>
  );
};

export default UiToolbar;
