// src/components/UiControls/UiControls.jsx
import React from 'react';
import styles from './UiControls.module.css';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useThemeZoom } from '../../hooks/useThemeZoom';

const UiControls = () => {
  const { theme, toggleTheme } = useThemeMode();     // 'light' | 'dark'
  const { zoom, dec, inc } = useThemeZoom();         // 75–150 (%)

  return (
    <div className={styles.wrapper} aria-label="Felhasználói vezérlők">
      {/* 1) Téma váltó */}
      <div className={styles.group}>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.pill}
          aria-label={theme === 'dark' ? 'Sötét mód' : 'Világos mód'}
          title={theme === 'dark' ? 'Sötét mód' : 'Világos mód'}
        >
          <span className={styles.icon}>
            {theme === 'dark' ? '🌙' : '🌞'}
          </span>
          <span className={styles.label}>
            {theme === 'dark' ? 'Sötét mód' : 'Világos mód'}
          </span>
        </button>
      </div>

      {/* 2) Nagyítás */}
      <div className={styles.group} aria-label="Nagyítás vezérlő">
        <button type="button" onClick={dec} className={styles.roundBtn} title="Kicsinyítés">−</button>
        <div className={styles.pillSmall}>{zoom}%</div>
        <button type="button" onClick={inc} className={styles.roundBtn} title="Nagyítás">+</button>
      </div>

      {/* 3) Jövőbeli funkciók helye – ide pakoljuk majd sorban lefelé */}
      <div className={styles.spacer} />
    </div>
  );
};

export default UiControls;
