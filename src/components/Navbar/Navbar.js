import React, { useState } from 'react';
import styles from './Navbar.module.css';

const Navbar = () => {
  // Új állapot a mobil menü nyitott/zárt állapotának kezelésére
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Függvény a mobil menü állapotának váltására
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <a href="/">
          "Fókusz Mester" Tanulási<br />Időzítő
        </a>
      </div>

      {/* A navLinks most egy feltételes class-t kap */}
      <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.open : ''}`}>
        <a href="/targy/matematika/5">Matematika</a>
        <a href="/targy/fizika/7">Fizika</a>
        <a href="/targy/aimi/0">AIMI 0. Év</a>
        <a href="/targy/aimi/1">AIMI 1</a>
        <a href="/targy/aimi/2">AIMI 2</a>
        <a href="/targy/aimi/szuperkepesseg">AIMI Szuperkepesseg</a>
      </div>

      <div className={styles.rightSide}>
        <div className={styles.search}>
          <input type="text" placeholder="Keress a tananyagban..." />
        </div>
        <div className={styles.authLinks}>
          <a href="/bejelentkezes" className={styles.loginButton}>Bejelentkezés</a>
          <a href="/regisztracio" className={styles.authButton}>Regisztráció</a>
        </div>

        {/* Hamburger menü ikon */}
        <div className={styles.hamburger} onClick={toggleMobileMenu}>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;