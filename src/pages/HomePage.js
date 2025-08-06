import React from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink'; // Az új komponenst használjuk

const HomePage = () => {
  return (
    <div>
      <Hero />
      <div className={styles.promoSection}>
        <h2>Próbáld ki Ingyen!</h2>
        <p>Válassz egy tantárgyat és egy osztályt a fenti menüből, vagy nézd meg a legnépszerűbb témaköröket!</p>
        <div className={styles.buttonContainer}>
            <ConditionalLink to="/targy/matematika/5" className={styles.promoButton}>
                Matematika 5.
            </ConditionalLink>
            <ConditionalLink to="/targy/matematika/6" className={styles.promoButton}>
                Matematika 6.
            </ConditionalLink>
        </div>
      </div>
    </div>
  );
};

export default HomePage;