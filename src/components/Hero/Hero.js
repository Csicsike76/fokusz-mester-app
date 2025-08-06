import React from 'react';
import styles from './Hero.module.css';

// A videó importot eltávolítottuk innen!
const Hero = () => {
  return (
    // A videó és az overlay div-eket eltávolítottuk
    <div className={styles.hero}>
      <div className={styles.content}>
        <h1>A Jövő Matematika Tanára</h1>
        <p>A küldetésem, hogy 2030-ig olyan inspiráló tanárrá váljak, aki nemcsak tanít, hanem gondolkodni tanít – empátiával, kreativitással és a mesterséges intelligencia tudatos használatával. Ez az én digitális eszköztáram.</p>
      </div>
    </div>
  );
};

export default Hero;