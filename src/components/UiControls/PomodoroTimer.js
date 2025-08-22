import React, { useState, useEffect } from 'react';
import styles from './UiControls.module.css';

const PomodoroTimer = () => {
  const WORK_TIME = 25 * 60;
  const SHORT_BREAK = 5 * 60;
  const LONG_BREAK = 15 * 60;

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // work | short | long
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    let timer;
    if(isRunning){
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if(timeLeft < 0){
      if(soundOn) new Audio('/beep.mp3').play();
      switchMode();
    }
  }, [timeLeft]);

  const switchMode = () => {
    if(mode === 'work'){
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      if(newCount % 4 === 0){ setMode('long'); setTimeLeft(LONG_BREAK); }
      else{ setMode('short'); setTimeLeft(SHORT_BREAK); }
    } else {
      setMode('work'); 
      setTimeLeft(WORK_TIME);
    }
  };

  const formatTime = t => {
    const m = Math.floor(t/60).toString().padStart(2,'0');
    const s = (t%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  const progressPercent = ((mode==='work' ? WORK_TIME : mode==='short' ? SHORT_BREAK : LONG_BREAK) - timeLeft) /
                          (mode==='work' ? WORK_TIME : mode==='short' ? SHORT_BREAK : LONG_BREAK) * 100;

  return (
    <div className={styles.pomodoroContainer}>
      <h3>Fókusz Mester</h3>
      <div className={styles.timeDisplay}>{formatTime(Math.max(timeLeft,0))}</div>
      <div className={styles.buttonGroup}>
        <button onClick={()=>setIsRunning(r=>!r)}>{isRunning ? '⏸ Szünet' : '▶ Start'}</button>
        <button onClick={()=>{setTimeLeft(WORK_TIME); setIsRunning(false); setMode('work')}}>↺ Reset</button>
        <button onClick={()=>setSoundOn(s=>!s)}>{soundOn ? '🔊' : '🔇'}</button>
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={()=>setTimeLeft(25*60)}>25p</button>
        <button onClick={()=>setTimeLeft(50*60)}>50p</button>
        <button onClick={()=>setTimeLeft(5*60)}>Szünet 5p</button>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressBarInner} style={{width:`${progressPercent}%`}}></div>
      </div>
      <div className={styles.pomodoroCount}>Pomodorók: {pomodoroCount} / 4</div>
    </div>
  );
}

export default PomodoroTimer;
