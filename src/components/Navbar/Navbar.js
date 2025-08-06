import React from 'react';
import styles from './Navbar.module.css';

const Navbar = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <a href="/" target="_blank" rel="noopener noreferrer">
          "Fókusz Mester" Tanulási<br />Időzítő
        </a>
      </div>
      <div className={styles.navLinks}>
        <a href="/targy/matematika/5" target="_blank" rel="noopener noreferrer">Matematika</a>
        <a href="/targy/fizika/7" target="_blank" rel="noopener noreferrer">Fizika</a>
        <a href="/targy/aimi/0" target="_blank" rel="noopener noreferrer">AIMI 0. Év</a>
        <a href="/targy/aimi/1" target="_blank" rel="noopener noreferrer">AIMI 1</a>
        <a href="/targy/aimi/2" target="_blank" rel="noopener noreferrer">AIMI 2</a>
        <a href="/targy/aimi/szuperkepesseg" target="_blank" rel="noopener noreferrer">AIMI Szuperkepesseg</a>
      </div>
      {/* Külön konténer a regisztráció/bejelentkezés gomboknak */}
      <div className={styles.authLinks}>
        {/* Bejelentkezés gomb hozzáadása */}
        <a href="/bejelentkezes" target="_blank" rel="noopener noreferrer" className={styles.loginButton}>
            Bejelentkezés
        </a>
        <a href="/regisztracio" target="_blank" rel="noopener noreferrer" className={styles.authButton}>
            Regisztráció
        </a>
      </div>
    </nav>
  );
};

export default Navbar;