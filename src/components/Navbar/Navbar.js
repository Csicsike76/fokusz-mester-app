import React, { useState } from 'react';
import styles from './Navbar.module.css';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import { useAuth } from '../../context/AuthContext'; // A központi állapot importálása

const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth(); // Kiolvassuk a felhasználót és a logout függvényt

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
          {/* ...többi menüpont... */}
          <ConditionalLink to="/targy/aimi/szuperkepesseg" onClick={handleLinkClick}>AIMI Szuperkepesseg</ConditionalLink>
        </div>

        {/* DINAMIKUS RÉSZ */}
        <div className={styles.authLinks}>
          {user ? (
            // Ha van bejelentkezett felhasználó:
            <>
              <span className={styles.welcomeUser}>Üdv, {user.username}!</span>
              <button onClick={logout} className={styles.logoutButton}>Kijelentkezés</button>
            </>
          ) : (
            // Ha nincs bejelentkezett felhasználó:
            <>
              <ConditionalLink to="/bejelentkezes" className={styles.loginButton} onClick={handleLinkClick}>Bejelentkezés</ConditionalLink>
              <ConditionalLink to="/regisztracio" className={styles.authButton} onClick={handleLinkClick}>Regisztráció</ConditionalLink>
            </>
          )}
        </div>
      </div>
      
      {/* ...search és hamburger részek változatlanok... */}
    </nav>
  );
};

export default Navbar;