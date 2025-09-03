// src/components/UiControls/UiControls.jsx
import React, { useState } from 'react';
import styles from './UiControls.module.css';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useThemeZoom } from '../../hooks/useThemeZoom';
import PomodoroTimer from './PomodoroTimer';

const UiControls = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeMode();
  const { zoom, dec, inc } = useThemeZoom();
  const [isPomodoroVisible, setIsPomodoroVisible] = useState(false);

  return (
    <>
      <div className={styles.wrapper} aria-label="Felhasználói vezérlők">
        <div className={styles.group}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className={styles.homeBtn}
            aria-label="Vissza a főoldalra"
            title="Vissza a főoldalra"
          >
            🏠
          </button>
        </div>

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

        <div className={styles.group} aria-label="Nagyítás vezérlő">
          <button type="button" onClick={dec} className={styles.roundBtn} title="Kicsinyítés">−</button>
          <div className={styles.pillSmall}>{zoom}%</div>
          <button type="button" onClick={inc} className={styles.roundBtn} title="Nagyítás">+</button>
        </div>

        <div className={styles.group}>
          <button
            type="button"
            onClick={() => setIsPomodoroVisible(v => !v)}
            className={`${styles.homeBtn} ${isPomodoroVisible ? styles.activeBtn : ''}`}
            aria-label="Fókusz időzítő megjelenítése/elrejtése"
            title="Fókusz időzítő"
          >
            ⏱️
          </button>
        </div>
        
        <div className={styles.spacer} />
      </div>

      {isPomodoroVisible && <PomodoroTimer />}
    </>
  );
};

export default UiControls;