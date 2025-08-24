import React, { useState, useEffect } from 'react';
import styles from './UiControls.module.css';

const PomodoroTimer = () => {
  const WORK_TIME = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 15 * 60;

  // A magyar zászló színei
  const HUNGARIAN_COLORS = ['#CD2A3E', '#FFFFFF', '#436F4D']; // Piros, Fehér, Zöld

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // work | short | long
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  
  // Állapot a dinamikus szín tárolására
  const [currentColor, setCurrentColor] = useState(HUNGARIAN_COLORS[0]);

  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(() => {
        setTimeLeft(t => {
          const newTime = t - 1;
          // Színváltás logikája: másodpercenként vált a színek között
          setCurrentColor(HUNGARIAN_COLORS[newTime % HUNGARIAN_COLORS.length]);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, HUNGARIAN_COLORS.length]);

  useEffect(() => {
    if (timeLeft < 0) {
      if (soundOn) new Audio('/beep.mp3').play();
      switchMode();
    }
  }, [timeLeft, soundOn]);

  const switchMode = () => {
    if (mode === 'work') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if (newCount % 4 === 0) {
        setMode('long');
        setTimeLeft(LONG_BREAK);
      } else {
        setMode('short');
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      setMode('work');
      setTimeLeft(WORK_TIME);
    }
    // Új ciklus kezdetekor a szín visszaáll pirosra
    setCurrentColor(HUNGARIAN_COLORS[0]);
  };

  const formatTime = t => {
    const m = Math.floor(t / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalTime = mode === 'work' ? WORK_TIME : mode === 'short' ? SHORT_BREAK : LONG_BREAK;
  const progressPercent = ((totalTime - timeLeft) / totalTime) * 100;

  const resetTimer = (newMode = 'work', newTime = WORK_TIME) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newTime);
    setCurrentColor(HUNGARIAN_COLORS[0]); // Reset-kor is piros legyen
  };

  return (
    <div className={styles.pomodoroContainer}>
      <h3 className={styles.pomodoroTitle} style={{ color: currentColor }}>Fókusz Mester</h3>
      <div className={styles.timeDisplay} style={{ color: currentColor }}>{formatTime(Math.max(timeLeft, 0))}</div>
      <div className={styles.buttonGroup}>
        <button onClick={() => setIsRunning(r => !r)}>{isRunning ? '⏸ Szünet' : '▶ Start'}</button>
        <button onClick={() => resetTimer('work', WORK_TIME)}>↺ Reset</button>
        <button onClick={() => setSoundOn(s => !s)}>{soundOn ? '🔊' : '🔇'}</button>
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={() => resetTimer('work', 25 * 60)}>25p</button>
        <button onClick={() => resetTimer('work', 50 * 60)}>50p</button>
        <button onClick={() => resetTimer('short', 5 * 60)}>Szünet 5p</button>
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressBarInner} 
          style={{ width: `${progressPercent}%`, backgroundColor: currentColor }}
        ></div>
      </div>
      <div className={styles.pomodoroCount}>Pomodorók: {pomodoroCount} / 4</div>
    </div>
  );
};

export default PomodoroTimer;