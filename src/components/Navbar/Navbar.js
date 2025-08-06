import React, { useState } from 'react';
import styles from './Navbar.module.css';
import ConditionalLink from '../ConditionalLink/ConditionalLink'; // JAVÍTOTT ÚTVONAL
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLinkClick = () => {
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <ConditionalLink to="/" onClick={handleLinkClick}>
          "Fókusz Mester" Tanulási<br />Időzítő
        </ConditionalLink>
      </div>

      <div className={`${styles.menuContainer} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.navLinks}>
          <ConditionalLink to="/targy/matematika/5" onClick={handleLinkClick}>Matematika</ConditionalLink>
          <ConditionalLink to="/targy/fizika/7" onClick={handleLinkClick}>Fizika</ConditionalLink>
          <ConditionalLink to="/targy/aimi/0" onClick={handleLinkClick}>AIMI 0. Év</ConditionalLink>
          <ConditionalLink to="/targy/aimi/1" onClick={handleLinkClick}>AIMI 1</ConditionalLink>
          <ConditionalLink to="/targy/aimi/2" onClick={handleLinkClick}>AIMI 2</ConditionalLink>
          <ConditionalLink to="/targy/aimi/szuperkepesseg" onClick={handleLinkClick}>AIMI Szuperkepesseg</ConditionalLink>
        </div>

        <div className={styles.authLinks}>
          {user ? (
            <>
              <span className={styles.welcomeUser}>Üdv, {user.username}!</span>
              <button onClick={logout} className={styles.logoutButton}>Kijelentkezés</button>
            </>
          ) : (
            <>
              <ConditionalLink to="/bejelentkezes" className={styles.loginButton} onClick={handleLinkClick}>Bejelentkezés</ConditionalLink>
              <ConditionalLink to="/regisztracio" className={styles.authButton} onClick={handleLinkClick}>Regisztráció</ConditionalLink>
            </>
          )}
        </div>
      </div>
      
      <div className={styles.search}>
        <input type="text" placeholder="Keress a tananyagban..." />
      </div>

      <div className={styles.hamburger} onClick={toggleMobileMenu}>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </nav>
  );
};

export default Navbar;