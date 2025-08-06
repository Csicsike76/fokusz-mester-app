import React from 'react';
import Hero from '../components/Hero/Hero';
// A Link komponenst innen is eltávolítjuk
import styles from './HomePage.module.css';

const HomePage = () => {
  return (
    <div>
      <Hero />
      <div className={styles.promoSection}>
        <h2>Próbáld ki Ingyen!</h2>
        <p>Válassz egy tantárgyat és egy osztályt a fenti menüből, vagy nézd meg a legnépszerűbb témaköröket!</p>
        <div className={styles.buttonContainer}>
            {/* A gombok most már <a> tagek */}
            <a href="/targy/matematika/5" className={styles.promoButton} target="_blank" rel="noopener noreferrer">
                Matematika 5.
            </a>
            <a href="/targy/matematika/6" className={styles.promoButton} target="_blank" rel="noopener noreferrer">
                Matematika 6.
            </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;